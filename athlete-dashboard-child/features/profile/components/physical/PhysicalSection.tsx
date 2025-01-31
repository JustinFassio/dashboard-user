import React, { useEffect, useState } from 'react';
import { Section } from '../Section';
import { MeasurementForm } from './MeasurementForm';
import { HistoryView } from './HistoryView';
import { physicalApi } from '../../api/physical';
import { PhysicalData } from '../../types/physical';
import './PhysicalSection.module.css';

interface PhysicalSectionProps {
    userId: number;
    onSave: () => Promise<void>;
    isSaving?: boolean;
    error?: string;
}

const DEFAULT_PHYSICAL_DATA: PhysicalData = {
    height: 0,
    weight: 0,
    units: {
        height: 'cm',
        weight: 'kg',
        measurements: 'cm'
    },
    preferences: {
        showMetric: true
    }
};

export const PhysicalSection: React.FC<PhysicalSectionProps> = ({
    userId,
    onSave,
    isSaving,
    error: propError
}) => {
    const [physicalData, setPhysicalData] = useState<PhysicalData>(DEFAULT_PHYSICAL_DATA);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPhysicalData();
    }, [userId]);

    const loadPhysicalData = async () => {
        try {
            const data = await physicalApi.getPhysicalData(userId);
            console.log('Physical data loaded:', data);
            setPhysicalData({
                ...DEFAULT_PHYSICAL_DATA,
                ...data,
                units: {
                    ...DEFAULT_PHYSICAL_DATA.units,
                    ...(data?.units || {})
                },
                preferences: {
                    ...DEFAULT_PHYSICAL_DATA.preferences,
                    ...(data?.preferences || {})
                }
            });
            setError(null);
        } catch (err) {
            console.error('Failed to load physical data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load physical data');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (data: PhysicalData) => {
        setLoading(true);
        try {
            console.log('Updating physical data:', data);
            const updatedData = await physicalApi.updatePhysicalData(userId, data);
            console.log('Update successful:', updatedData);
            setPhysicalData({
                ...DEFAULT_PHYSICAL_DATA,
                ...updatedData,
                units: {
                    ...DEFAULT_PHYSICAL_DATA.units,
                    ...(updatedData?.units || {})
                },
                preferences: {
                    ...DEFAULT_PHYSICAL_DATA.preferences,
                    ...(updatedData?.preferences || {})
                }
            });
            await onSave();
            setError(null);
        } catch (err) {
            console.error('Update failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to update physical data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Section title="Physical Information">
                <div className="physical-section__loading" role="status" aria-live="polite">
                    Loading physical data...
                </div>
            </Section>
        );
    }

    return (
        <Section title="Physical Information">
            <p className="section-description">
                Track your physical measurements and monitor your progress over time.
            </p>
            <MeasurementForm 
                initialData={physicalData}
                onUpdate={handleUpdate}
            />
            <HistoryView userId={userId} />
            {(error || propError) && (
                <div className="physical-section__error" role="alert">
                    <p>{error || propError}</p>
                </div>
            )}
        </Section>
    );
}; 