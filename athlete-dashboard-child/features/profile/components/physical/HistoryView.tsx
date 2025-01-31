import React, { useState, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import { physicalApi } from '../../api/physical';
import { PhysicalHistory, PhysicalHistoryResponse } from '../../types/physical';
import { Button } from '../../../../dashboard/components/Button';

interface HistoryViewProps {
  userId: number;
}

interface PaginationState {
  offset: number;
  limit: number;
  total: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const DEFAULT_UNITS = {
  height: 'cm',
  weight: 'kg',
  measurements: 'cm'
};

export const HistoryView: React.FC<HistoryViewProps> = ({ userId }) => {
  const [history, setHistory] = useState<PhysicalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    offset: 0,
    limit: 10,
    total: 0
  });

  const loadHistory = async () => {
    try {
      console.log('Loading history for user:', userId);
      setLoading(true);
      const response = await physicalApi.getPhysicalHistory(
        userId,
        pagination.offset,
        pagination.limit
      ) as unknown as ApiResponse<PhysicalHistoryResponse>;
      console.log('History response:', response);
      
      // Unwrap the response data
      const historyData = response.success ? response.data : { items: [], total: 0, limit: 10, offset: 0 };
      console.log('Unwrapped history data:', historyData);
      
      setHistory(historyData.items);
      setPagination(prev => ({ ...prev, total: historyData.total }));
      setError(null);
    } catch (e) {
      console.error('Failed to load history:', e);
      setError('Failed to load measurement history');
      setHistory([]); // Reset history on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('HistoryView mounted/updated. UserId:', userId);
    if (userId) loadHistory();
  }, [userId, pagination.offset, pagination.limit]);

  const handleNextPage = () => {
    if (pagination.offset + pagination.limit < pagination.total) {
      setPagination(prev => ({
        ...prev,
        offset: prev.offset + prev.limit
      }));
    }
  };

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      setPagination(prev => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit)
      }));
    }
  };

  const formatMeasurement = (value: number | null | undefined, unit: string | undefined, defaultUnit: string): string => {
    if (value == null) return '-';
    return `${value} ${unit || defaultUnit}`;
  };

  if (loading) {
    console.log('HistoryView: Loading state');
    return (
      <div className="loading" role="status" aria-live="polite">
        {__('Loading history...')}
      </div>
    );
  }

  if (error) {
    console.log('HistoryView: Error state:', error);
    return (
      <div className="error" role="alert">
        {__('Error:')} {error}
      </div>
    );
  }

  console.log('HistoryView: Rendering table with history:', history);
  return (
    <section className="history-section" aria-labelledby="history-title">
      <h3 id="history-title">{__('Measurement History')}</h3>

      {history.length === 0 ? (
        <p>{__('No measurement history available.')}</p>
      ) : (
        <>
          <div className="table-wrapper" role="region" aria-label="Measurement history table" tabIndex={0}>
            <table className="history-table">
              <thead>
                <tr>
                  <th scope="col">{__('Date')}</th>
                  <th scope="col">{__('Height')}</th>
                  <th scope="col">{__('Weight')}</th>
                  <th scope="col">{__('Chest')}</th>
                  <th scope="col">{__('Waist')}</th>
                  <th scope="col">{__('Hips')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.id}>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    <td>{formatMeasurement(item.height, item?.units?.height, DEFAULT_UNITS.height)}</td>
                    <td>{formatMeasurement(item.weight, item?.units?.weight, DEFAULT_UNITS.weight)}</td>
                    <td>{formatMeasurement(item.chest, item?.units?.measurements, DEFAULT_UNITS.measurements)}</td>
                    <td>{formatMeasurement(item.waist, item?.units?.measurements, DEFAULT_UNITS.measurements)}</td>
                    <td>{formatMeasurement(item.hips, item?.units?.measurements, DEFAULT_UNITS.measurements)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="pagination" aria-label="History pagination">
            <Button
              variant="secondary"
              feature="physical"
              onClick={handlePrevPage}
              disabled={pagination.offset === 0}
              aria-label="Previous page"
            >
              {__('Previous')}
            </Button>
            <span>
              {__('Showing')} {pagination.offset + 1} {__('to')}{' '}
              {Math.min(pagination.offset + pagination.limit, pagination.total)}{' '}
              {__('of')} {pagination.total}
            </span>
            <Button
              variant="secondary"
              feature="physical"
              onClick={handleNextPage}
              disabled={pagination.offset + pagination.limit >= pagination.total}
              aria-label="Next page"
            >
              {__('Next')}
            </Button>
          </nav>
        </>
      )}
    </section>
  );
}; 