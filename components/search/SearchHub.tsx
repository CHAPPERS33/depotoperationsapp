
import React from 'react';
import { User as UserIcon, MapPin, TrendingUp, Search } from 'lucide-react';
import { useSharedState } from '../../hooks/useSharedState'; // Corrected path if needed

const SearchHub: React.FC = () => {
  const { focusHeaderSearchInput } = useSharedState();

  const searchInfoCards = [
    {
      title: 'Courier Search',
      description: 'Find courier performance, missing parcel history, and recent activity.',
      example: 'e.g., "C001", "Mark Taylor"',
      icon: UserIcon,
      color: 'blue',
    },
    {
      title: 'Round Analysis',
      description: 'Analyze specific rounds, associated couriers, sorters, and parcel issues.',
      example: 'e.g., "Round 5", "R110028"',
      icon: MapPin,
      color: 'green',
    },
    {
      title: 'Drop Investigation',
      description: 'Perform cross-round analysis for specific drop numbers to identify patterns.',
      example: 'e.g., "Drop 3", "D7"',
      icon: TrendingUp,
      color: 'purple',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 animate-fadeIn">
        <div className="flex items-center mb-6">
          <Search className="w-8 h-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-semibold text-gray-800">Search & Investigation Hub</h2>
        </div>
        <p className="text-gray-600 mb-8">
          Use the search bar in the header to find Courier, Round, or Drop information. 
          The system will provide quick links to detailed profiles. Click a card below to start a search.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {searchInfoCards.map((card) => (
            <button
              key={card.title}
              onClick={focusHeaderSearchInput}
              className={`p-6 border-2 border-gray-200 rounded-lg hover:shadow-lg hover:border-${card.color}-500 hover:bg-${card.color}-50 text-left transition-all relative focus:outline-none focus:ring-2 focus:ring-${card.color}-500 focus:ring-opacity-50`}
              aria-label={`Search for ${card.title}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <card.icon className={`w-7 h-7 text-${card.color}-600`} />
                <h3 className={`font-semibold text-xl text-${card.color}-700`}>{card.title}</h3>
              </div>
              <p className={`text-sm text-${card.color}-600 mb-3`}>{card.description}</p>
              <p className="text-xs text-gray-500 font-mono">{card.example}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchHub;
