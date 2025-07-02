
'use client';

import React, { useState, useMemo } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { SubDepot, Round, CageLabelData } from '../../types';
import Button from '../shared/Button';
import { Printer, Tag, CheckSquare, Square } from 'lucide-react';
import { generateCageLabelPrintHtml, printHtmlStringToNewWindow } from '../../utils/printUtils';

const CageLabelPrinter: React.FC = () => {
  const { subDepots, rounds } = useSharedState();
  const [selectedSubDepotId, setSelectedSubDepotId] = useState<number | string>('');
  const [selectedRoundIds, setSelectedRoundIds] = useState<string[]>([]);

  const roundsForSelectedSubDepot = useMemo(() => {
    if (!selectedSubDepotId) return [];
    return rounds.filter(r => r.sub_depot_id === Number(selectedSubDepotId)).sort((a, b) => a.id.localeCompare(b.id));
  }, [selectedSubDepotId, rounds]);

  const handleSubDepotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubDepotId(e.target.value);
    setSelectedRoundIds([]); 
  };

  const handleRoundSelectionChange = (roundId: string) => {
    setSelectedRoundIds(prev =>
      prev.includes(roundId) ? prev.filter(id => id !== roundId) : [...prev, roundId]
    );
  };

  const handleSelectAllRounds = () => {
    if (selectedRoundIds.length === roundsForSelectedSubDepot.length) {
      setSelectedRoundIds([]);
    } else {
      setSelectedRoundIds(roundsForSelectedSubDepot.map(r => r.id));
    }
  };

  const handlePrintLabels = () => {
    if (selectedRoundIds.length === 0) {
      alert('Please select at least one round to print labels for.');
      return;
    }

    const selectedSubDepot = subDepots.find(sd => sd.id === Number(selectedSubDepotId));
    if (!selectedSubDepot) {
      alert('Selected sub-depot not found.');
      return;
    }

    const labelsData: CageLabelData[] = selectedRoundIds.map(roundId => {
      const round = rounds.find(r => r.id === roundId);
      return {
        dropNumber: round?.drop_number || 0,
        roundId: round?.id || 'N/A',
        subDepotName: selectedSubDepot.name,
      };
    }).filter(data => data.dropNumber > 0); 

    if (labelsData.length === 0) {
      alert('No valid round data to print labels for.');
      return;
    }

    const htmlContent = generateCageLabelPrintHtml(labelsData);
    printHtmlStringToNewWindow(htmlContent, 'Cage Labels');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center mb-4 border-b pb-4">
        <Tag className="w-7 h-7 text-rose-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-800">Cage Label Printer</h2>
      </div>

      <div>
        <label htmlFor="subDepotSelect" className="block text-sm font-medium text-gray-700 mb-1">
          Select Sub-Depot
        </label>
        <select
          id="subDepotSelect"
          value={selectedSubDepotId}
          onChange={handleSubDepotChange}
          className="mt-1 block w-full md:w-1/2 p-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">-- Choose a Sub-Depot --</option>
          {subDepots.map(sd => (
            <option key={sd.id} value={sd.id}>{sd.name}</option>
          ))}
        </select>
      </div>

      {selectedSubDepotId && roundsForSelectedSubDepot.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-medium text-gray-700">
              Select Rounds for {subDepots.find(sd => sd.id === Number(selectedSubDepotId))?.name}
            </h3>
            <Button
              onClick={handleSelectAllRounds}
              variant="outline"
              size="sm"
              leftIcon={selectedRoundIds.length === roundsForSelectedSubDepot.length ? CheckSquare : Square}
            >
              {selectedRoundIds.length === roundsForSelectedSubDepot.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2 bg-gray-50">
            {roundsForSelectedSubDepot.map(round => (
              <label key={round.id} className="flex items-center p-2 bg-white border rounded-md hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRoundIds.includes(round.id)}
                  onChange={() => handleRoundSelectionChange(round.id)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-3"
                />
                <span className="text-sm text-gray-700">Round {round.id} (Drop {round.drop_number})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {selectedSubDepotId && roundsForSelectedSubDepot.length === 0 && (
        <p className="text-gray-500">No rounds configured for the selected sub-depot.</p>
      )}

      <div className="pt-4 border-t">
        <Button
          onClick={handlePrintLabels}
          variant="primary"
          leftIcon={Printer}
          disabled={selectedRoundIds.length === 0}
          size="lg"
        >
          Print {selectedRoundIds.length > 0 ? `${selectedRoundIds.length} Label(s)` : 'Labels'}
        </Button>
      </div>
    </div>
  );
};

export default CageLabelPrinter;
