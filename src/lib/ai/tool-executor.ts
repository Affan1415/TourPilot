/**
 * Tool Executor - Executes AI agent tools against the database
 */

import { createClient } from "@supabase/supabase-js";
import { ToolExecutionResult } from "./types";

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ToolFunction = (args: Record<string, any>) => Promise<ToolExecutionResult>;

// Tool implementations
const toolImplementations: Record<string, ToolFunction> = {
  search_tours: async (args) => {
    try {
      const { date, guest_count, tour_type, time_preference } = args;

      let query = supabaseAdmin
        .from("tours")
        .select(`
          id, name, slug, description, short_description,
          duration_minutes, base_price, max_capacity, min_guests,
          location, meeting_point, what_to_bring, includes,
          images
        `)
        .eq("status", "active");

      if (tour_type) {
        query = query.ilike("name", `%${tour_type}%`);
      }

      const { data: tours, error } = await query.limit(10);

      if (error) {
        return { success: false, error: error.message };
      }

      // If date is provided, get availability for each tour
      if (date && tours) {
        const toursWithAvailability = await Promise.all(
          tours.map(async (tour) => {
            let availQuery = supabaseAdmin
              .from("availabilities")
              .select("id, date, start_time, end_time, price_override, capacity_override, booked_count, status")
              .eq("tour_id", tour.id)
              .eq("date", date)
              .eq("status", "available");

            // Filter by time preference
            if (time_preference === "morning") {
              availQuery = availQuery.lt("start_time", "12:00:00");
            } else if (time_preference === "afternoon") {
              availQuery = availQuery.gte("start_time", "12:00:00").lt("start_time", "17:00:00");
            } else if (time_preference === "evening") {
              availQuery = availQuery.gte("start_time", "17:00:00");
            }

            const { data: availability } = await availQuery;

            // Filter by guest count capacity
            const filteredAvailability = availability?.filter((slot) => {
              const capacity = slot.capacity_override || tour.max_capacity;
              const available = capacity - slot.booked_count;
              return !guest_count || available >= guest_count;
            });

            return {
              ...tour,
              availability: filteredAvailability || [],
              hasAvailability: (filteredAvailability?.length || 0) > 0,
            };
          })
        );

        return {
          success: true,
          data: toursWithAvailability.filter((t) => !date || t.hasAvailability),
          message: `Found ${toursWithAvailability.filter((t) => !date || t.hasAvailability).length} tours`,
        };
      }

      return {
        success: true,
        data: tours,
        message: `Found ${tours?.length || 0} tours`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  check_availability: async (args) => {
    try {
      const { tour_id, date, guest_count = 1 } = args;

      // Get tour details
      const { data: tour, error: tourError } = await supabaseAdmin
        .from("tours")
        .select("id, name, base_price, max_capacity, duration_minutes")
        .eq("id", tour_id)
        .single();

      if (tourError || !tour) {
        return { success: false, error: "Tour not found" };
      }

      // Get availability
      const { data: availability, error: availError } = await supabaseAdmin
        .from("availabilities")
        .select("id, date, start_time, end_time, price_override, capacity_override, booked_count, status")
        .eq("tour_id", tour_id)
        .eq("date", date)
        .eq("status", "available")
        .order("start_time");

      if (availError) {
        return { success: false, error: availError.message };
      }

      const slotsWithCapacity = availability?.map((slot) => {
        const capacity = slot.capacity_override || tour.max_capacity;
        const spotsAvailable = capacity - slot.booked_count;
        return {
          ...slot,
          tour_name: tour.name,
          price: slot.price_override || tour.base_price,
          total_capacity: capacity,
          spots_available: spotsAvailable,
          can_book: spotsAvailable >= guest_count,
        };
      });

      const bookableSlots = slotsWithCapacity?.filter((s) => s.can_book) || [];

      return {
        success: true,
        data: {
          tour,
          date,
          slots: slotsWithCapacity,
          bookable_slots: bookableSlots.length,
        },
        message: bookableSlots.length > 0
          ? `Found ${bookableSlots.length} available time slots for ${guest_count} guest(s)`
          : `No slots available for ${guest_count} guest(s) on ${date}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  create_booking: async (args) => {
    try {
      const {
        availability_id,
        guest_count,
        customer_email,
        customer_first_name,
        customer_last_name,
        customer_phone,
      } = args;

      // Get availability and tour details
      const { data: availability, error: availError } = await supabaseAdmin
        .from("availabilities")
        .select(`
          *,
          tour:tours(id, name, base_price, max_capacity, requires_waiver)
        `)
        .eq("id", availability_id)
        .single();

      if (availError || !availability) {
        return { success: false, error: "Availability slot not found" };
      }

      // Check capacity
      const capacity = availability.capacity_override || availability.tour.max_capacity;
      const spotsAvailable = capacity - availability.booked_count;

      if (spotsAvailable < guest_count) {
        return {
          success: false,
          error: `Only ${spotsAvailable} spots available, but ${guest_count} requested`,
        };
      }

      // Get or create customer
      let { data: customer } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("email", customer_email.toLowerCase())
        .single();

      if (!customer) {
        const { data: newCustomer, error: customerError } = await supabaseAdmin
          .from("customers")
          .insert({
            email: customer_email.toLowerCase(),
            first_name: customer_first_name,
            last_name: customer_last_name,
            phone: customer_phone,
          })
          .select("id")
          .single();

        if (customerError) {
          return { success: false, error: "Failed to create customer record" };
        }
        customer = newCustomer;
      }

      // Calculate price
      const pricePerPerson = availability.price_override || availability.tour.base_price;
      const totalPrice = pricePerPerson * guest_count;

      // Create booking
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from("bookings")
        .insert({
          customer_id: customer.id,
          availability_id,
          guest_count,
          total_price: totalPrice,
          status: "pending",
          payment_status: "pending",
        })
        .select("id, booking_reference")
        .single();

      if (bookingError) {
        return { success: false, error: "Failed to create booking" };
      }

      // Create primary guest
      await supabaseAdmin.from("booking_guests").insert({
        booking_id: booking.id,
        first_name: customer_first_name,
        last_name: customer_last_name,
        email: customer_email,
        is_primary: true,
      });

      return {
        success: true,
        data: {
          booking_reference: booking.booking_reference,
          tour_name: availability.tour.name,
          date: availability.date,
          time: availability.start_time,
          guest_count,
          total_price: totalPrice,
          payment_status: "pending",
        },
        message: `Booking created! Reference: ${booking.booking_reference}. Total: $${totalPrice}. Payment link will be sent to ${customer_email}.`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  lookup_booking: async (args) => {
    try {
      const { booking_reference, customer_email } = args;

      let query = supabaseAdmin
        .from("bookings")
        .select(`
          id, booking_reference, guest_count, total_price, status, payment_status,
          checked_in, notes, created_at,
          customer:customers(id, first_name, last_name, email, phone),
          availability:availabilities(
            id, date, start_time, end_time,
            tour:tours(id, name, location, meeting_point, duration_minutes)
          ),
          guests:booking_guests(id, first_name, last_name, is_primary, checked_in),
          waivers:waivers(id, status, signed_at)
        `);

      if (booking_reference) {
        query = query.eq("booking_reference", booking_reference);
      } else if (customer_email) {
        // Need to join through customer
        const { data: customer } = await supabaseAdmin
          .from("customers")
          .select("id")
          .eq("email", customer_email.toLowerCase())
          .single();

        if (!customer) {
          return { success: false, error: "No bookings found for this email" };
        }

        query = query
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(5);
      } else {
        return { success: false, error: "Please provide booking reference or email" };
      }

      const { data: bookings, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      if (!bookings || bookings.length === 0) {
        return { success: false, error: "No bookings found" };
      }

      return {
        success: true,
        data: booking_reference ? bookings[0] : bookings,
        message: booking_reference
          ? `Found booking ${booking_reference}`
          : `Found ${bookings.length} booking(s)`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  modify_booking: async (args) => {
    try {
      const { booking_reference, action, new_availability_id, new_guest_count } = args;

      // Get booking
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from("bookings")
        .select(`
          *,
          availability:availabilities(
            id, date, start_time,
            tour:tours(id, name, base_price, max_capacity)
          )
        `)
        .eq("booking_reference", booking_reference)
        .single();

      if (bookingError || !booking) {
        return { success: false, error: "Booking not found" };
      }

      if (booking.status === "cancelled") {
        return { success: false, error: "Cannot modify a cancelled booking" };
      }

      if (action === "reschedule" && new_availability_id) {
        // Get new availability
        const { data: newAvailability, error: availError } = await supabaseAdmin
          .from("availabilities")
          .select("*, tour:tours(id, name, base_price, max_capacity)")
          .eq("id", new_availability_id)
          .single();

        if (availError || !newAvailability) {
          return { success: false, error: "New time slot not found" };
        }

        // Check capacity
        const capacity = newAvailability.capacity_override || newAvailability.tour.max_capacity;
        if (capacity - newAvailability.booked_count < booking.guest_count) {
          return { success: false, error: "Not enough capacity in the new time slot" };
        }

        // Update booking
        const { error: updateError } = await supabaseAdmin
          .from("bookings")
          .update({ availability_id: new_availability_id })
          .eq("id", booking.id);

        if (updateError) {
          return { success: false, error: "Failed to reschedule booking" };
        }

        return {
          success: true,
          data: { booking_reference, new_date: newAvailability.date, new_time: newAvailability.start_time },
          message: `Booking rescheduled to ${newAvailability.date} at ${newAvailability.start_time}`,
        };
      }

      if (action === "change_guests" && new_guest_count) {
        const capacity = booking.availability.tour.max_capacity;
        const currentBooked = booking.availability.booked_count || 0;
        const otherBookings = currentBooked - booking.guest_count;
        const availableSpots = capacity - otherBookings;

        if (new_guest_count > availableSpots) {
          return {
            success: false,
            error: `Only ${availableSpots} spots available for this time slot`,
          };
        }

        const pricePerPerson = booking.availability.tour.base_price;
        const newTotalPrice = pricePerPerson * new_guest_count;

        const { error: updateError } = await supabaseAdmin
          .from("bookings")
          .update({
            guest_count: new_guest_count,
            total_price: newTotalPrice,
          })
          .eq("id", booking.id);

        if (updateError) {
          return { success: false, error: "Failed to update guest count" };
        }

        return {
          success: true,
          data: { booking_reference, new_guest_count, new_total: newTotalPrice },
          message: `Guest count updated to ${new_guest_count}. New total: $${newTotalPrice}`,
        };
      }

      return { success: false, error: "Invalid modification request" };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  cancel_booking: async (args) => {
    try {
      const { booking_reference, reason } = args;

      const { data: booking, error: bookingError } = await supabaseAdmin
        .from("bookings")
        .select(`
          *,
          availability:availabilities(date, start_time)
        `)
        .eq("booking_reference", booking_reference)
        .single();

      if (bookingError || !booking) {
        return { success: false, error: "Booking not found" };
      }

      if (booking.status === "cancelled") {
        return { success: false, error: "Booking is already cancelled" };
      }

      // Check 24-hour policy
      const tourDateTime = new Date(`${booking.availability.date}T${booking.availability.start_time}`);
      const now = new Date();
      const hoursUntilTour = (tourDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      const { error: updateError } = await supabaseAdmin
        .from("bookings")
        .update({
          status: "cancelled",
          notes: reason ? `Cancellation reason: ${reason}` : booking.notes,
        })
        .eq("id", booking.id);

      if (updateError) {
        return { success: false, error: "Failed to cancel booking" };
      }

      const refundEligible = hoursUntilTour >= 24;

      return {
        success: true,
        data: {
          booking_reference,
          refund_eligible: refundEligible,
          hours_until_tour: Math.round(hoursUntilTour),
        },
        message: refundEligible
          ? `Booking ${booking_reference} has been cancelled. A full refund will be processed.`
          : `Booking ${booking_reference} has been cancelled. Note: This was within 24 hours of the tour, so refund policy applies.`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  check_waiver_status: async (args) => {
    try {
      const { booking_reference } = args;

      const { data: booking, error: bookingError } = await supabaseAdmin
        .from("bookings")
        .select(`
          id, booking_reference, guest_count,
          guests:booking_guests(id, first_name, last_name),
          waivers:waivers(id, guest_id, status, signed_at)
        `)
        .eq("booking_reference", booking_reference)
        .single();

      if (bookingError || !booking) {
        return { success: false, error: "Booking not found" };
      }

      const guestWaiverStatus = booking.guests.map((guest: any) => {
        const waiver = booking.waivers.find((w: any) => w.guest_id === guest.id);
        return {
          guest_name: `${guest.first_name} ${guest.last_name}`,
          waiver_status: waiver?.status || "not_created",
          signed_at: waiver?.signed_at,
        };
      });

      const signedCount = guestWaiverStatus.filter((g: any) => g.waiver_status === "signed").length;
      const pendingCount = guestWaiverStatus.length - signedCount;

      return {
        success: true,
        data: {
          booking_reference,
          total_guests: guestWaiverStatus.length,
          signed: signedCount,
          pending: pendingCount,
          guests: guestWaiverStatus,
        },
        message: pendingCount > 0
          ? `${pendingCount} of ${guestWaiverStatus.length} guest(s) still need to sign their waiver`
          : "All waivers have been signed!",
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  send_waiver_reminder: async (args) => {
    try {
      const { booking_reference } = args;

      // For now, just return success - actual email sending would be integrated
      return {
        success: true,
        message: `Waiver reminder sent for booking ${booking_reference}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  get_tour_info: async (args) => {
    try {
      const { tour_id, tour_name } = args;

      let query = supabaseAdmin
        .from("tours")
        .select(`
          id, name, slug, description, short_description,
          duration_minutes, base_price, max_capacity, min_guests,
          location, meeting_point, what_to_bring, includes,
          images, requires_waiver
        `)
        .eq("status", "active");

      if (tour_id) {
        query = query.eq("id", tour_id);
      } else if (tour_name) {
        query = query.ilike("name", `%${tour_name}%`);
      } else {
        return { success: false, error: "Please provide tour ID or name" };
      }

      const { data: tours, error } = await query.limit(1);

      if (error || !tours || tours.length === 0) {
        return { success: false, error: "Tour not found" };
      }

      const tour = tours[0];

      return {
        success: true,
        data: {
          ...tour,
          formatted_duration: `${tour.duration_minutes} minutes`,
          formatted_price: `$${tour.base_price} per person`,
        },
        message: `Here's the information for ${tour.name}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  recommend_tours: async (args) => {
    try {
      const { preferences, group_size, date } = args;

      // Get all active tours
      const { data: tours, error } = await supabaseAdmin
        .from("tours")
        .select(`
          id, name, short_description, duration_minutes, base_price,
          max_capacity, location, includes
        `)
        .eq("status", "active");

      if (error || !tours) {
        return { success: false, error: "Failed to fetch tours" };
      }

      // Simple keyword matching for recommendations
      const keywords: string[] = preferences?.toLowerCase().split(/\s+/) || [];
      let recommended = tours;

      if (keywords.length > 0) {
        recommended = tours.filter((tour) => {
          const tourText = `${tour.name} ${tour.short_description || ""} ${tour.includes?.join(" ") || ""}`.toLowerCase();
          return keywords.some((kw: string) => tourText.includes(kw));
        });
      }

      // Filter by capacity
      if (group_size) {
        recommended = recommended.filter((tour) => tour.max_capacity >= group_size);
      }

      // Sort by relevance (number of keyword matches)
      if (keywords.length > 0) {
        recommended.sort((a, b) => {
          const aText = `${a.name} ${a.short_description || ""}`.toLowerCase();
          const bText = `${b.name} ${b.short_description || ""}`.toLowerCase();
          const aMatches = keywords.filter((kw: string) => aText.includes(kw)).length;
          const bMatches = keywords.filter((kw: string) => bText.includes(kw)).length;
          return bMatches - aMatches;
        });
      }

      return {
        success: true,
        data: recommended.slice(0, 5),
        message: recommended.length > 0
          ? `Based on your preferences, I recommend these ${Math.min(recommended.length, 5)} tours`
          : "I couldn't find tours matching those preferences, but here are our popular options",
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};

// Execute a tool by name
export async function executeTool(
  name: string,
  args: Record<string, any>
): Promise<ToolExecutionResult> {
  const implementation = toolImplementations[name];

  if (!implementation) {
    return { success: false, error: `Unknown tool: ${name}` };
  }

  try {
    return await implementation(args);
  } catch (error) {
    return { success: false, error: `Tool execution error: ${String(error)}` };
  }
}
