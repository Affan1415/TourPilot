-- =============================================
-- Create Waiver Template and Pending Waivers for All Guests
-- =============================================

DO $$
DECLARE
  v_template_id UUID;
  v_guest RECORD;
BEGIN
  -- Get or create a default waiver template
  SELECT id INTO v_template_id FROM waiver_templates WHERE is_active = true LIMIT 1;

  IF v_template_id IS NULL THEN
    INSERT INTO waiver_templates (name, content, is_active)
    VALUES (
      'Standard Liability Waiver',
      E'# Liability Waiver and Release Form\n\n## Assumption of Risk\nI understand that participating in water-based activities involves inherent risks, including but not limited to:\n- Changing water and weather conditions\n- Risk of drowning\n- Collision with other watercraft or objects\n- Equipment failure\n- Physical exertion\n\n## Release of Liability\nIn consideration of being permitted to participate in this tour/activity, I hereby release, waive, discharge, and covenant not to sue the tour operator, its owners, employees, and agents from any and all liability, claims, demands, and causes of action whatsoever.\n\n## Medical Fitness\nI certify that I am physically fit and able to participate in water activities. I have no medical conditions that would prevent safe participation.\n\n## Safety Instructions\nI agree to follow all safety instructions provided by the crew and to wear a life jacket when required.\n\n## Photo/Video Release\nI grant permission for photos and videos taken during the tour to be used for promotional purposes.\n\n## Agreement\nBy signing below, I acknowledge that I have read this waiver, understand its contents, and agree to its terms.',
      true
    )
    RETURNING id INTO v_template_id;

    RAISE NOTICE 'Created waiver template: %', v_template_id;
  ELSE
    RAISE NOTICE 'Using existing waiver template: %', v_template_id;
  END IF;

  -- Create pending waivers for all booking guests that don't have one
  FOR v_guest IN
    SELECT bg.id as guest_id, bg.booking_id
    FROM booking_guests bg
    JOIN bookings b ON bg.booking_id = b.id
    WHERE b.status IN ('confirmed', 'pending')
    AND NOT EXISTS (
      SELECT 1 FROM waivers w WHERE w.guest_id = bg.id AND w.booking_id = bg.booking_id
    )
  LOOP
    INSERT INTO waivers (booking_id, guest_id, waiver_template_id, status)
    VALUES (v_guest.booking_id, v_guest.guest_id, v_template_id, 'pending')
    ON CONFLICT (booking_id, guest_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Created pending waivers for all guests without waivers';
END $$;

-- Show summary
DO $$
DECLARE
  waiver_count INT;
  pending_count INT;
  signed_count INT;
BEGIN
  SELECT COUNT(*) INTO waiver_count FROM waivers;
  SELECT COUNT(*) INTO pending_count FROM waivers WHERE status = 'pending';
  SELECT COUNT(*) INTO signed_count FROM waivers WHERE status = 'signed';

  RAISE NOTICE 'Total waivers: %, Pending: %, Signed: %', waiver_count, pending_count, signed_count;
END $$;
