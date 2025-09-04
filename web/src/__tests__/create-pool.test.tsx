import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CreatePool from '@/app/create-pool/page'

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: '0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c',
    isConnected: true,
  })),
  useBalance: vi.fn(() => ({
    data: {
      value: BigInt('5000000000000000000'), // 5 ETH
    },
  })),
}))

// Mock the usePoolFactory hook
vi.mock('@/hooks/usePoolFactory', () => ({
  useCreatePool: vi.fn(() => ({
    createPool: vi.fn(),
    isLoading: false,
    isSuccess: false,
    error: null,
    hash: null,
  })),
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}))

describe('CreatePool Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders create pool form with all required fields', () => {
    render(<CreatePool />)
    
    expect(screen.getByText('Create New Pool')).toBeInTheDocument()
    expect(screen.getByLabelText(/Pool Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Contribution Amount/)).toBeInTheDocument()
    expect(screen.getByText('ETH')).toBeInTheDocument()
    expect(screen.getByLabelText(/Pool Size/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Duration/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create Pool/ })).toBeInTheDocument()
  })

  it('validates form inputs correctly', async () => {
    render(<CreatePool />)
    
    const createButton = screen.getByRole('button', { name: /Create Pool/ })
    fireEvent.click(createButton)
    
    await waitFor(() => {
      expect(screen.getByText('Pool name is required')).toBeInTheDocument()
      expect(screen.getByText('Valid contribution amount is required')).toBeInTheDocument()
      expect(screen.getByText('Pool size must be between 2 and 100 members')).toBeInTheDocument()
      expect(screen.getByText('Please select a duration')).toBeInTheDocument()
    })
  })

  it('shows pool summary when form is filled', async () => {
    render(<CreatePool />)
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/Pool Name/), { target: { value: 'Test Pool' } })
    fireEvent.change(screen.getByLabelText(/Contribution Amount/), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/Pool Size/), { target: { value: '10' } })
    
    // Select duration
    const durationSelect = screen.getByDisplayValue('Select duration')
    fireEvent.click(durationSelect)
    fireEvent.click(screen.getByText('30 Days'))
    
    await waitFor(() => {
      expect(screen.getByText('Pool Summary')).toBeInTheDocument()
      expect(screen.getByText(/Total pool size: 10.0000 ETH/)).toBeInTheDocument()
      expect(screen.getByText(/Duration: 30 days/)).toBeInTheDocument()
    })
  })

  it('validates minimum and maximum contribution amounts', async () => {
    render(<CreatePool />)
    
    const contributionInput = screen.getByLabelText(/Contribution Amount/)
    
    // Test minimum
    fireEvent.change(contributionInput, { target: { value: '0.005' } })
    fireEvent.blur(contributionInput)
    
    await waitFor(() => {
      expect(screen.getByText('Minimum contribution is 0.01 ETH')).toBeInTheDocument()
    })
    
    // Test maximum
    fireEvent.change(contributionInput, { target: { value: '101' } })
    fireEvent.blur(contributionInput)
    
    await waitFor(() => {
      expect(screen.getByText('Maximum contribution is 100 ETH')).toBeInTheDocument()
    })
  })

  it('validates pool size constraints', async () => {
    render(<CreatePool />)
    
    const poolSizeInput = screen.getByLabelText(/Pool Size/)
    
    // Test minimum
    fireEvent.change(poolSizeInput, { target: { value: '1' } })
    fireEvent.blur(poolSizeInput)
    
    await waitFor(() => {
      expect(screen.getByText('Pool size must be between 2 and 100 members')).toBeInTheDocument()
    })
    
    // Test maximum
    fireEvent.change(poolSizeInput, { target: { value: '101' } })
    fireEvent.blur(poolSizeInput)
    
    await waitFor(() => {
      expect(screen.getByText('Pool size must be between 2 and 100 members')).toBeInTheDocument()
    })
  })
})
