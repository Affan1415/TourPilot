import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from '../stat-card'
import { DollarSign, Users, Calendar } from 'lucide-react'

describe('StatCard', () => {
  it('renders title and value', () => {
    render(
      <StatCard
        title="Total Revenue"
        value="$12,345"
        icon={<DollarSign />}
      />
    )

    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('$12,345')).toBeInTheDocument()
  })

  it('accepts ReactNode as icon prop', () => {
    render(
      <StatCard
        title="Users"
        value="500"
        icon={<Users className="h-5 w-5" />}
      />
    )

    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(
      <StatCard
        title="Bookings"
        value="42"
        icon={<Calendar />}
        description="Last 30 days"
      />
    )

    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
  })

  it('renders trend indicator when provided', () => {
    render(
      <StatCard
        title="Revenue"
        value="$5,000"
        icon={<DollarSign />}
        trend={{ value: 15, isPositive: true }}
      />
    )

    expect(screen.getByText('+15%')).toBeInTheDocument()
  })

  it('renders negative trend correctly', () => {
    render(
      <StatCard
        title="Revenue"
        value="$5,000"
        icon={<DollarSign />}
        trend={{ value: 10, isPositive: false }}
      />
    )

    expect(screen.getByText('10%')).toBeInTheDocument()
  })

  it('applies correct color variant', () => {
    const { container } = render(
      <StatCard
        title="Test"
        value="100"
        icon={<Calendar />}
        color="peach"
      />
    )

    const card = container.querySelector('.stat-card')
    expect(card).toHaveClass('bg-peach')
  })

  it('accepts custom className', () => {
    const { container } = render(
      <StatCard
        title="Test"
        value="100"
        icon={<Calendar />}
        className="custom-class"
      />
    )

    const card = container.querySelector('.stat-card')
    expect(card).toHaveClass('custom-class')
  })
})
