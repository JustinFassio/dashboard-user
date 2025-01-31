import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { MeasurementForm } from '../../../components/physical/MeasurementForm';
import { PhysicalSection } from '../../../components/physical/PhysicalSection';
import { HistoryView } from '../../../components/physical/HistoryView';
import { PhysicalData } from '../../../types/physical';

// Mock the physicalApi
jest.mock('../../../api/physical', () => ({
  physicalApi: {
    getPhysicalData: jest.fn(),
    updatePhysicalData: jest.fn(),
    getPhysicalHistory: jest.fn()
  }
}));

describe('Physical Data Handling', () => {
  const mockOnUpdate = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MeasurementForm Data Handling', () => {
    it('should handle undefined or missing data gracefully', () => {
      const incompleteData = {
        height: 180,
        weight: 80
      } as unknown as PhysicalData;

      render(<MeasurementForm initialData={incompleteData} onUpdate={mockOnUpdate} />);

      // Check if the form renders without errors
      expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();

      // Verify default units are applied
      const heightInput = screen.getByLabelText(/height/i).closest('.input-wrapper');
      const heightUnit = heightInput?.querySelector('span[aria-label="unit"]');
      expect(heightUnit).toHaveTextContent('cm');
    });

    it('should handle height conversion from metric to imperial accurately', async () => {
      const metricData: PhysicalData = {
        height: 180.34,
        weight: 80,
        units: {
          height: 'cm',
          weight: 'kg',
          measurements: 'cm'
        },
        preferences: {
          showMetric: true
        }
      };

      render(<MeasurementForm initialData={metricData} onUpdate={mockOnUpdate} />);

      // Switch to imperial
      const imperialButton = screen.getByRole('radio', { name: /imperial/i });
      fireEvent.click(imperialButton);

      // Wait for button state to update
      await waitFor(() => {
        expect(imperialButton).toHaveAttribute('aria-checked', 'true');
      });

      // Wait for height inputs to appear and have correct values
      await waitFor(() => {
        const feetInput = screen.getByRole('spinbutton', { name: /feet/i }) as HTMLInputElement;
        const inchesInput = screen.getByRole('spinbutton', { name: /inches/i }) as HTMLInputElement;
        
        expect(feetInput).toBeInTheDocument();
        expect(inchesInput).toBeInTheDocument();
        expect(feetInput.value).toBe('5');
        expect(inchesInput.value).toBe('11');
      });
    });

    it('should handle height conversion from imperial to metric accurately', async () => {
      const imperialData: PhysicalData = {
        height: 180.34,
        heightFeet: 5,
        heightInches: 11,
        weight: 80,
        units: {
          height: 'ft',
          weight: 'kg',
          measurements: 'cm'
        },
        preferences: {
          showMetric: false
        }
      };

      render(<MeasurementForm initialData={imperialData} onUpdate={mockOnUpdate} />);

      // Switch to metric
      const metricButton = screen.getByRole('radio', { name: /metric/i });
      fireEvent.click(metricButton);

      // Wait for and check conversion accuracy
      await waitFor(() => {
        expect(metricButton).toHaveAttribute('aria-checked', 'true');
      });

      await waitFor(() => {
        const heightInput = screen.getByLabelText(/height/i) as HTMLInputElement;
        expect(parseFloat(heightInput.value)).toBeCloseTo(180.34, 1);
      });
    });
  });

  describe('HistoryView Data Handling', () => {
    it('should handle history items with missing units', async () => {
      const mockHistory = {
        success: true,
        data: {
          items: [{
            id: '1',
            user_id: '1',
            height: 180.34,
            weight: 80,
            date: '2024-01-31'
          }],
          total: 1,
          limit: 10,
          offset: 0
        }
      };

      (require('../../../api/physical').physicalApi.getPhysicalHistory as jest.Mock)
        .mockResolvedValue(mockHistory);

      render(<HistoryView userId={1} />);

      await waitFor(() => {
        expect(screen.getByText('180.34 cm')).toBeInTheDocument();
        expect(screen.getByText('80 kg')).toBeInTheDocument();
      });
    });

    it('should handle null measurements', async () => {
      const mockHistory = {
        success: true,
        data: {
          items: [{
            id: '1',
            user_id: '1',
            height: 180.34,
            weight: 80,
            chest: null,
            waist: null,
            hips: null,
            date: '2024-01-31',
            units: {
              height: 'cm',
              weight: 'kg',
              measurements: 'cm'
            }
          }],
          total: 1,
          limit: 10,
          offset: 0
        }
      };

      (require('../../../api/physical').physicalApi.getPhysicalHistory as jest.Mock)
        .mockResolvedValue(mockHistory);

      render(<HistoryView userId={1} />);

      await waitFor(() => {
        const dashes = screen.getAllByText('-');
        expect(dashes).toHaveLength(3); // chest, waist, hips should all show '-'
      });
    });
  });

  describe('PhysicalSection Integration', () => {
    it('should handle the complete data flow', async () => {
      const mockData: PhysicalData = {
        height: 180.34,
        weight: 80,
        units: {
          height: 'cm',
          weight: 'kg',
          measurements: 'cm'
        },
        preferences: {
          showMetric: true
        }
      };

      (require('../../../api/physical').physicalApi.getPhysicalData as jest.Mock)
        .mockResolvedValue(mockData);

      render(
        <PhysicalSection 
          userId={1}
          onSave={mockOnSave}
        />
      );

      // Wait for initial data to load
      await waitFor(() => {
        const heightInput = screen.getByLabelText(/height/i) as HTMLInputElement;
        const weightInput = screen.getByLabelText(/weight/i) as HTMLInputElement;
        expect(parseFloat(heightInput.value)).toBeCloseTo(180.34, 1);
        expect(parseFloat(weightInput.value)).toBeCloseTo(80, 1);
      });

      // Test unit conversion
      const imperialButton = screen.getByRole('radio', { name: /imperial/i });
      fireEvent.click(imperialButton);

      // Wait for button state to update
      await waitFor(() => {
        expect(imperialButton).toHaveAttribute('aria-checked', 'true');
      });

      // Wait for height inputs to appear and have correct values
      await waitFor(() => {
        const feetInput = screen.getByRole('spinbutton', { name: /feet/i }) as HTMLInputElement;
        const inchesInput = screen.getByRole('spinbutton', { name: /inches/i }) as HTMLInputElement;
        
        expect(feetInput).toBeInTheDocument();
        expect(inchesInput).toBeInTheDocument();
        expect(feetInput.value).toBe('5');
        expect(inchesInput.value).toBe('11');
      }, { timeout: 2000 });
    });
  });
}); 