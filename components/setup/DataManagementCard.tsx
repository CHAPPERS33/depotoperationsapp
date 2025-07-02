import React, { useEffect } from 'react';
import { useSharedState, DatabaseStatusCounts } from '../../hooks/useSharedState';
import Button from '../shared/Button';
import { Database, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

const DataManagementCard: React.FC = () => {
  const {
    handleSeedDatabase,
    handleCheckDatabaseStatus,
    isSeeding,
    seedMessage,
    isCheckingStatus,
    databaseStatus,
    statusError,
    clearSeedMessage
  } = useSharedState();

  useEffect(() => {
    // Automatically check status on mount if no status is present
    if (!databaseStatus && !isCheckingStatus && !statusError && !seedMessage) {
        handleCheckDatabaseStatus();
    }
  }, [databaseStatus, isCheckingStatus, statusError, seedMessage, handleCheckDatabaseStatus]); // Added handleCheckDatabaseStatus to dependency array

  const formatKey = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };
  
  const handleClearMessages = () => {
    clearSeedMessage(); // This clears both seedMessage and statusError in useSharedState
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-500">
      <div className="flex items-center mb-4">
        <Database className="w-6 h-6 text-blue-600 mr-3" />
        <h3 className="text-lg font-semibold text-gray-800">Database Management</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Initialize the database with sample data or check the current record counts.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Button 
          onClick={handleSeedDatabase} 
          isLoading={isSeeding} 
          disabled={isSeeding || isCheckingStatus}
          variant="primary"
          className="flex-1"
        >
          {isSeeding ? 'Seeding...' : 'Initialize / Seed Database'}
        </Button>
        <Button 
          onClick={handleCheckDatabaseStatus} 
          isLoading={isCheckingStatus} 
          disabled={isSeeding || isCheckingStatus}
          variant="outline"
          className="flex-1"
        >
          {isCheckingStatus ? 'Checking...' : 'Check Current Data'}
        </Button>
      </div>

      {(seedMessage || statusError) && (
        <div className={`my-4 p-3 rounded-md text-sm border ${statusError ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-300 text-green-700'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
                {statusError ? <AlertTriangle className="w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                <span>{seedMessage || statusError}</span>
            </div>
            <button onClick={handleClearMessages} className="text-xs font-semibold hover:underline">Dismiss</button>
          </div>
        </div>
      )}

      {databaseStatus && !isCheckingStatus && (
        <div className="mt-4">
          <h4 className="font-semibold text-gray-700 mb-2">Current Data Counts:</h4>
          {Object.keys(databaseStatus).length === 0 ? (
            <p className="text-sm text-gray-500">No data counts available or database might be empty.</p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {Object.entries(databaseStatus).map(([key, value]) => (
                <li key={key} className="bg-gray-100 p-2 rounded">
                  <span className="font-medium text-gray-600">{formatKey(key)}:</span> {value.count}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default DataManagementCard;