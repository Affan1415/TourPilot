'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Circle, Clock, Zap } from 'lucide-react';

export default function TimelinePage() {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  const phases = [
    {
      id: 'phase1',
      title: 'Core Location & Captain Management',
      duration: 'Days 1-7 (Week 1)',
      status: 'upcoming',
      color: 'bg-blue-500',
      icon: '🗺️',
      features: [
        {
          name: 'Location Management (CRUD)',
          items: [
            'Create locations table with details (address, coordinates, description)',
            'Admin dashboard for managing locations',
            'Location activation/deactivation',
            'Search and filter locations',
          ],
        },
        {
          name: 'Boat Management',
          items: [
            'Add multiple boats per location',
            'Track boat capacity and details',
            'Boat availability status',
            'Assign boats to captains',
          ],
        },
        {
          name: 'Captain Assignments',
          items: [
            'Assign captains to locations and boats',
            'Captain location switching',
            'Captain view their assignments',
            'Boat-specific manifest',
          ],
        },
        {
          name: 'Database & Permissions',
          items: [
            'Location-based RLS policies',
            'Captain access control by location',
            'Location-boat relationships',
            'Audit trail for assignments',
          ],
        },
      ],
      deliverables: [
        'Locations admin page',
        'Boat management UI',
        'Captain assignment interface',
        '5 new API endpoints',
        'Database migrations',
      ],
    },
    {
      id: 'phase2',
      title: 'Multi-Location Tours & Booking Rescheduling',
      duration: 'Days 8-12 (Week 2)',
      status: 'upcoming',
      color: 'bg-purple-500',
      icon: '📅',
      features: [
        {
          name: 'Location-Based Tours',
          items: [
            'Tours operate from multiple locations',
            'Location selector during booking',
            'Location-specific pricing',
            'Location availability tracking',
          ],
        },
        {
          name: 'Booking Reschedule System',
          items: [
            'Customer-initiated reschedule requests',
            'Admin approval workflow',
            'Calendar picker for new dates',
            'Automated email notifications',
            'Reschedule history tracking',
          ],
        },
        {
          name: 'Multiple Boats per Location',
          items: [
            'Boat-specific availabilities',
            'Per-boat capacity tracking',
            'Boat switching for captains',
            'Boat assignment in bookings',
          ],
        },
      ],
      deliverables: [
        'Reschedule request flow',
        'Updated tour booking page',
        'Reschedule management dashboard',
        'Email templates (3)',
        '6 new API endpoints',
      ],
    },
    {
      id: 'phase3',
      title: 'Customer Analytics & POS System',
      duration: 'Days 13-21 (Weeks 2-3)',
      status: 'upcoming',
      color: 'bg-green-500',
      icon: '💰',
      features: [
        {
          name: 'Customer Behavior & Scoring',
          items: [
            'Loyalty score calculation',
            'Tier system (Bronze/Silver/Gold/Platinum)',
            'Customer lifetime value tracking',
            'Booking frequency analytics',
            'Favorite tour tracking',
            'Group size analysis',
          ],
        },
        {
          name: 'POS System - Online & Offline',
          items: [
            'Create transactions linked to bookings',
            'Add-on items and merchandise sales',
            'Multiple payment methods (Cash, Card, Check)',
            'Offline transaction queuing',
            'Automatic sync when online',
            'Receipt generation and printing',
          ],
        },
        {
          name: 'POS Analytics',
          items: [
            'Daily/weekly/monthly revenue reports',
            'Payment method breakdown',
            'Top items sold tracking',
            'Staff sales leaderboard',
            'Discount/coupon analytics',
          ],
        },
        {
          name: 'Birthday Campaign System',
          items: [
            'Automatic birthday detection',
            'Personalized discount emails',
            'Campaign performance tracking',
            'Email template customization',
            'Scheduled send capability',
          ],
        },
      ],
      deliverables: [
        'Customer analytics dashboard',
        'Loyalty score display',
        'POS transaction system',
        'Offline sync system',
        'Birthday campaign automation',
        'POS reports page',
        '12 new API endpoints',
        'IndexedDB implementation',
      ],
    },
    {
      id: 'phase4',
      title: 'Payments, Polish & Testing',
      duration: 'Days 22-24.5 (Week 3.5)',
      status: 'upcoming',
      color: 'bg-orange-500',
      icon: '✨',
      features: [
        {
          name: 'Stripe Payment Integration',
          items: [
            'Complete Stripe integration',
            'Payment intent creation',
            'Webhook handling',
            '3D Secure support',
            'Refund processing',
            'Payment failure recovery',
          ],
        },
        {
          name: 'UI Polish & UX',
          items: [
            'Consistent design system',
            'Dark mode support',
            'Mobile responsiveness audit',
            'Loading states and skeletons',
            'Empty state designs',
            'Animation and transitions',
            'Accessibility improvements (WCAG AA)',
          ],
        },
        {
          name: 'Testing Suite',
          items: [
            'Unit tests for critical functions',
            'Integration tests for workflows',
            'E2E tests for user journeys',
            'Performance testing (<3s page load)',
            'Security testing',
            'Cross-browser compatibility',
          ],
        },
        {
          name: 'Deployment & DevOps',
          items: [
            'Production environment setup',
            'Error tracking (Sentry)',
            'Monitoring and alerts',
            'Database backup strategy',
            'API documentation',
            'Go-live checklist',
          ],
        },
      ],
      deliverables: [
        'Stripe payment flow',
        'Webhook handler',
        'Polished UI across all pages',
        'Comprehensive test suite',
        'API documentation',
        'Deployment guide',
        'Staff training materials',
      ],
    },
  ];

  const timeline = [
    {
      week: 'Week 1',
      days: '1-7',
      milestones: [
        'Day 1-3: Location management system',
        'Day 2-4: Admin location UI',
        'Day 4-5: Captain assignments',
        'Day 5-7: Database relationships',
      ],
    },
    {
      week: 'Week 2',
      days: '8-12',
      milestones: [
        'Day 8-9: Location-based availability',
        'Day 9-11: Booking reschedule system',
        'Day 11-12: Multi-boat management',
      ],
    },
    {
      week: 'Week 3',
      days: '13-21',
      milestones: [
        'Day 13-15: Customer scoring',
        'Day 15-18: POS backend',
        'Day 17-19: POS frontend',
        'Day 19-21: Birthday campaigns',
      ],
    },
    {
      week: 'Week 4 (Half)',
      days: '22-24.5',
      milestones: [
        'Day 22-23: Stripe integration',
        'Day 22-24: UI polish',
        'Day 22-24.5: Testing & deployment',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-12 px-4 md:px-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            TourPilot Development Timeline
          </h1>
          <p className="text-xl text-slate-300 mb-4">
            3.5 Week Sprint to Production-Ready Platform
          </p>
          <div className="flex justify-center gap-4 mb-6">
            <Badge className="bg-blue-600">Start Today</Badge>
            <Badge className="bg-emerald-600">24.5 Days Total</Badge>
            <Badge className="bg-purple-600">4 Major Phases</Badge>
          </div>
          <p className="text-slate-400 max-w-2xl mx-auto">
            A comprehensive development plan covering all remaining features: location management,
            booking rescheduling, customer analytics, POS system, payment integration, and complete
            testing suite.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {/* Weekly Timeline Overview */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Weekly Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {timeline.map((week, index) => (
              <Card key={index} className="bg-slate-800 border-slate-700 hover:border-slate-500 transition">
                <CardHeader>
                  <CardTitle className="text-lg">{week.week}</CardTitle>
                  <CardDescription>Days {week.days}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {week.milestones.map((milestone, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-300">
                        <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <span>{milestone}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Phases Detail */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Phase Details</h2>
          <div className="space-y-6">
            {phases.map((phase) => (
              <Card
                key={phase.id}
                className="bg-slate-800 border-slate-700 hover:border-slate-500 transition cursor-pointer"
                onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <span className="text-3xl">{phase.icon}</span>
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{phase.title}</CardTitle>
                        <CardDescription className="flex gap-3 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {phase.duration}
                          </span>
                          <Badge className="bg-slate-700">{phase.status}</Badge>
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {expandedPhase === phase.id && (
                  <CardContent className="space-y-6 border-t border-slate-700 pt-6">
                    {/* Features */}
                    <div>
                      <h4 className="font-semibold text-lg mb-4">Features & Tasks</h4>
                      <div className="space-y-4">
                        {phase.features.map((feature, idx) => (
                          <div key={idx} className="bg-slate-700/50 rounded-lg p-4">
                            <h5 className="font-medium mb-3 flex items-center gap-2">
                              <Circle className="w-2 h-2 fill-blue-400 text-blue-400" />
                              {feature.name}
                            </h5>
                            <ul className="space-y-2 ml-4">
                              {feature.items.map((item, itemIdx) => (
                                <li key={itemIdx} className="flex gap-2 text-sm text-slate-300">
                                  <span className="text-blue-400 font-bold">•</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Deliverables */}
                    <div>
                      <h4 className="font-semibold text-lg mb-4">Expected Deliverables</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {phase.deliverables.map((deliverable, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            {deliverable}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Success Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: 'Test Coverage', value: '90%+', icon: '✅' },
              { label: 'Page Load Time', value: '<3 seconds', icon: '⚡' },
              { label: 'Security Vulnerabilities', value: 'Zero Critical', icon: '🔒' },
              { label: 'API Endpoints', value: '25+', icon: '📡' },
              { label: 'Database Tables', value: '20+', icon: '💾' },
              { label: 'Accessibility Level', value: 'WCAG AA', icon: '♿' },
            ].map((metric, idx) => (
              <Card key={idx} className="bg-slate-800 border-slate-700">
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl mb-2">{metric.icon}</div>
                  <div className="text-2xl font-bold text-emerald-400 mb-1">{metric.value}</div>
                  <div className="text-sm text-slate-400">{metric.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Features Summary Table */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Features Overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold">Feature</th>
                  <th className="text-left py-3 px-4 font-semibold">Phase</th>
                  <th className="text-left py-3 px-4 font-semibold">Timeline</th>
                  <th className="text-left py-3 px-4 font-semibold">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {[
                  { feature: 'Location Management', phase: 1, days: '1-7', priority: 'Critical' },
                  { feature: 'Captain Assignments', phase: 1, days: '4-5', priority: 'Critical' },
                  { feature: 'Multi-Boat System', phase: 2, days: '11-12', priority: 'Critical' },
                  { feature: 'Booking Reschedules', phase: 2, days: '9-11', priority: 'High' },
                  { feature: 'Customer Scoring', phase: 3, days: '13-15', priority: 'High' },
                  { feature: 'POS System', phase: 3, days: '15-19', priority: 'High' },
                  { feature: 'Offline Sync', phase: 3, days: '17-19', priority: 'High' },
                  { feature: 'Birthday Campaigns', phase: 3, days: '19-21', priority: 'Medium' },
                  { feature: 'Stripe Payments', phase: 4, days: '22-23', priority: 'Critical' },
                  { feature: 'Testing Suite', phase: 4, days: '22-24.5', priority: 'Critical' },
                  { feature: 'UI Polish', phase: 4, days: '22-24', priority: 'High' },
                  { feature: 'Deployment', phase: 4, days: '23-24.5', priority: 'Critical' },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition">
                    <td className="py-3 px-4">{row.feature}</td>
                    <td className="py-3 px-4">Phase {row.phase}</td>
                    <td className="py-3 px-4 text-slate-400">Days {row.days}</td>
                    <td className="py-3 px-4">
                      <Badge
                        className={
                          row.priority === 'Critical'
                            ? 'bg-red-600'
                            : row.priority === 'High'
                              ? 'bg-orange-600'
                              : 'bg-yellow-600'
                        }
                      >
                        {row.priority}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Integration Points */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Technology Integration Points</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                name: 'Database (Supabase)',
                items: ['Location tables', 'Boat management', 'Customer scoring', 'POS transactions', 'Payment logs'],
              },
              {
                name: 'Email System (Resend)',
                items: ['Reschedule emails', 'Birthday campaigns', 'Payment confirmations', 'Campaign tracking'],
              },
              {
                name: 'Payment (Stripe)',
                items: ['Payment intents', 'Webhook handling', 'Refund processing', '3D Secure'],
              },
              {
                name: 'Frontend Framework (Next.js)',
                items: ['New pages/routes', 'API endpoints', 'Offline POS (IndexedDB)', 'Service workers'],
              },
            ].map((tech, idx) => (
              <Card key={idx} className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">{tech.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tech.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex gap-2 text-sm text-slate-300">
                        <span className="text-emerald-400">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-emerald-600 to-blue-600 border-0 mb-8">
          <CardContent className="pt-8 text-center">
            <h3 className="text-2xl font-bold mb-3">Ready to Start Development?</h3>
            <p className="text-lg mb-6 opacity-90">
              Detailed implementation guide available in DEVELOPMENT_ROADMAP.md
            </p>
            <button className="bg-white text-slate-900 px-8 py-3 rounded-lg font-semibold hover:bg-slate-100 transition">
              View Full Roadmap
            </button>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="text-center text-slate-400 text-sm">
          <p>
            This timeline is based on estimated effort for a single developer. Adjust timelines based on team
            size and experience level.
          </p>
        </div>
      </div>
    </div>
  );
}
