'use client'; 

import React from 'react';
import { useSharedState } from '../../hooks/useSharedState'; 
import { SetupView } from '../../types'; 
import TeamManager from '../../components/setup/TeamManager';
import RoundsManager from '../../components/setup/RoundsManager'; 
import CouriersManager from '../../components/setup/CouriersManager'; 
import ClientsManager from '../../components/setup/ClientsManager'; 
import DeliveryUnitsManager from '../../components/setup/DeliveryUnitsManager'; 
import SubDepotsManager from '../../components/setup/SubDepotsManager'; 
import VehiclesManager from '../../components/setup/VehiclesManager'; 
import HHTAssetsManager from '../../components/setup/HHTAssetsManager'; 
import HHTLoginsManager from '../../components/setup/HHTLoginsManager'; 
import PayPeriodsManager from '../../components/setup/PayPeriodsManager'; 
import TimeslotsManager from '../../components/setup/TimeslotsManager'; 
import CageLabelPrinter from '../../components/setup/CageLabelPrinter'; 
import EmailTriggersManager from '../../components/setup/EmailTriggersManager'; 
import DataManagementCard from '../../components/setup/DataManagementCard'; 
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Users, ListTree, Truck, Package, Building, MapPin, Car, Wrench, Layers, CalendarDays, Clock, Tag, MailPlus } from 'lucide-react';
import ProtectedRoute from '../../components/ProtectedRoute';

// Define user roles for access control
type UserRole = 'manager' | 'sorter' | 'cdm' | 'guest' | 'duc'; 

interface SetupMenuCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  view: SetupView;
  color: string; 
  currentView: SetupView;
  setView: (view: SetupView) => void;
  count?: number | string;
  countLabel?: string;
}

const SetupMenuCard: React.FC<SetupMenuCardProps> = ({ title, description, icon: Icon, view, color, setView, count, countLabel }) => (
  <button
    onClick={() => setView(view)}
    className={`p-6 border-2 border-gray-200 rounded-lg hover:shadow-lg hover:border-${color}-500 hover:bg-${color}-50 text-left transition-all relative focus:outline-none focus:ring-2 focus:ring-${color}-500 focus:ring-opacity-50`}
    aria-label={`Go to ${title}`}
  >
    {count !== undefined && (
      <span className={`absolute top-2 right-2 bg-${color}-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full`}>
        {count} {countLabel || ''}
      </span>
    )}
    <Icon className={`w-10 h-10 text-${color}-600 mb-3`} />
    <h3 className="font-semibold text-xl mb-1 text-gray-800">{title}</h3>
    <p className="text-sm text-gray-600 h-12 overflow-hidden">{description}</p>
  </button>
);

export default function SetupPage() {
  const allowedRoles: UserRole[] = ['manager']; // Only managers can access setup

  const {
    team, rounds, couriers, clients, deliveryUnits, subDepots, vehicles, hhtAssets, hhtLogins, payPeriods, timeslotTemplates, emailTriggers
  } = useSharedState();
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewParam = searchParams?.get('view') as SetupView | null;

  const currentView: SetupView = viewParam || 'menu';

  const setView = (view: SetupView) => {
    router.push(`${pathname}?view=${view}`);
  };

  const menuItems: Omit<SetupMenuCardProps, 'currentView' | 'setView'>[] = [
    { title: 'Manage Team', description: 'Sorters, DUCs, Marshalls', icon: Users, view: 'team', color: 'blue', count: team.length, countLabel: 'Members' },
    { title: 'Manage Rounds', description: 'Round IDs, sub-depot, drop', icon: ListTree, view: 'rounds', color: 'green', count: rounds.length, countLabel: 'Rounds' },
    { title: 'Manage Couriers', description: 'Courier details', icon: Truck, view: 'couriers', color: 'purple', count: couriers.length, countLabel: 'Couriers' },
    { title: 'Manage Clients', description: 'Client names, codes, priority', icon: Package, view: 'clients', color: 'yellow', count: clients.length, countLabel: 'Clients' },
    { title: 'Manage Delivery Units', description: 'Main delivery units (e.g., EDM)', icon: Building, view: 'deliveryunits', color: 'red', count: deliveryUnits.length, countLabel: 'Units' },
    { title: 'Manage Sub Depots', description: 'Sub depots within DUs', icon: MapPin, view: 'subdepots', color: 'orange', count: subDepots.length, countLabel: 'Sub Depots' },
    { title: 'Manage Vehicles', description: 'Vehicle registrations, types', icon: Car, view: 'vehicles', color: 'teal', count: vehicles.length, countLabel: 'Vehicles' },
    { title: 'Manage HHT Assets', description: 'Scanners, assignments, status', icon: Wrench, view: 'hhtassets', color: 'pink', count: hhtAssets.length, countLabel: 'Assets' },
    { title: 'Manage HHT Logins', description: 'HHT login IDs & PINs', icon: Layers, view: 'hhtlogins', color: 'cyan', count: hhtLogins.length, countLabel: 'Logins' },
    { title: 'Manage Pay Periods', description: 'Define financial periods', icon: CalendarDays, view: 'payperiods', color: 'indigo', count: payPeriods.length, countLabel: 'Periods' },
    { title: 'Manage Timeslots', description: 'Templates & courier assignments', icon: Clock, view: 'timeslots', color: 'lime', count: timeslotTemplates.length, countLabel: 'Templates' },
    { title: 'Cage Label Printer', description: 'Generate and print cage labels', icon: Tag, view: 'cagelabels', color: 'rose'},
    { title: 'Email Triggers', description: 'Configure scheduled email reports', icon: MailPlus, view: 'emailTriggers', color: 'sky', count: emailTriggers.length, countLabel: 'Triggers' },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'team': return <TeamManager />;
      case 'rounds': return <RoundsManager />;
      case 'couriers': return <CouriersManager />;
      case 'clients': return <ClientsManager />;
      case 'deliveryunits': return <DeliveryUnitsManager />;
      case 'subdepots': return <SubDepotsManager />;
      case 'vehicles': return <VehiclesManager />;
      case 'hhtassets': return <HHTAssetsManager />;
      case 'hhtlogins': return <HHTLoginsManager />;
      case 'payperiods': return <PayPeriodsManager />;
      case 'timeslots': return <TimeslotsManager />;
      case 'cagelabels': return <CageLabelPrinter />;
      case 'emailTriggers': return <EmailTriggersManager />; 
      case 'menu':
      default:
        return (
          <div className="space-y-8">
            <DataManagementCard />
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Setup & Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {menuItems.map(item => (
                  <SetupMenuCard
                    key={item.view}
                    {...item}
                    currentView={currentView}
                    setView={setView}
                  />
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div>
        {renderView()}
      </div>
    </ProtectedRoute>
  );
}