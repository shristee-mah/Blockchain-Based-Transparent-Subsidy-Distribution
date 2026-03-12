"use client";

import React from 'react';
import { 
  MapPin, 
  Truck, 
  Mountain, 
  Road, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Navigation
} from 'lucide-react';

interface Location {
  name: string;
  type: 'warehouse' | 'hub' | 'checkpoint' | 'destination';
  status: 'completed' | 'current' | 'upcoming';
  roadCondition?: 'Blacktopped' | 'Gravel' | 'Landslide Risk';
  terrain?: 'Urban' | 'Highway' | 'Rural' | 'Hill';
  distance?: number;
}

interface RouteMapProps {
  currentLocation?: { lat: number; lng: number };
  lastHub?: string;
  roadCondition?: 'Blacktopped' | 'Gravel' | 'Landslide Risk';
  terrain?: 'Urban' | 'Highway' | 'Rural' | 'Hill';
  progress: number; // 0-100
}

const RouteMap: React.FC<RouteMapProps> = ({ 
  currentLocation, 
  lastHub, 
  roadCondition, 
  terrain, 
  progress 
}) => {
  // Sample route from Kathmandu to Nuwakot village
  const route: Location[] = [
    {
      name: 'Kathmandu Warehouse',
      type: 'warehouse',
      status: 'completed',
      distance: 0
    },
    {
      name: 'Balaju Hub',
      type: 'hub', 
      status: 'completed',
      roadCondition: 'Blacktopped',
      terrain: 'Urban',
      distance: 5
    },
    {
      name: 'Prithvi Highway Checkpoint',
      type: 'checkpoint',
      status: progress > 33 ? 'completed' : progress > 0 ? 'current' : 'upcoming',
      roadCondition: 'Blacktopped',
      terrain: 'Highway',
      distance: 25
    },
    {
      name: 'Bidur (Nuwakot HQ)',
      type: 'hub',
      status: progress > 66 ? 'completed' : progress > 33 ? 'current' : 'upcoming',
      roadCondition: 'Gravel',
      terrain: 'Rural',
      distance: 65
    },
    {
      name: 'Rural Village Drop-off',
      type: 'destination',
      status: progress > 90 ? 'completed' : progress > 66 ? 'current' : 'upcoming',
      roadCondition: 'Gravel',
      terrain: 'Hill',
      distance: 85
    }
  ];

  const getRoadConditionIcon = (condition?: string) => {
    switch (condition) {
      case 'Blacktopped':
        return <Road className="w-4 h-4 text-green-600" />;
      case 'Gravel':
        return <Mountain className="w-4 h-4 text-yellow-600" />;
      case 'Landslide Risk':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Road className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTerrainIcon = (terrain?: string) => {
    switch (terrain) {
      case 'Urban':
        return '🏙️';
      case 'Highway':
        return '🛣️';
      case 'Rural':
        return '🌾';
      case 'Hill':
        return '⛰️';
      default:
        return '📍';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'current':
        return 'bg-blue-100 border-blue-300 text-blue-800 animate-pulse';
      case 'upcoming':
        return 'bg-gray-100 border-gray-300 text-gray-600';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-600" />
          Route Overview: Kathmandu → Nuwakot
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">{lastHub || 'Balaju'}</span>
          </div>
          <div className="flex items-center gap-1">
            {getRoadConditionIcon(roadCondition)}
            <span className="text-gray-600">{roadCondition || 'Unknown'}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Route Timeline */}
      <div className="space-y-4">
        {route.map((location, index) => (
          <div key={location.name} className="flex items-start gap-4">
            {/* Connection Line */}
            {index < route.length - 1 && (
              <div className="flex flex-col items-center">
                <div className={`w-0.5 h-8 ${
                  location.status === 'completed' ? 'bg-green-400' : 'bg-gray-300'
                }`} />
              </div>
            )}

            {/* Location Node */}
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 rounded-full border-2 ${getStatusColor(location.status)}`}>
                {location.type === 'warehouse' && <MapPin className="w-4 h-4" />}
                {location.type === 'hub' && <Truck className="w-4 h-4" />}
                {location.type === 'checkpoint' && <CheckCircle className="w-4 h-4" />}
                {location.type === 'destination' && <MapPin className="w-4 h-4" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800">{location.name}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{getTerrainIcon(location.terrain)}</span>
                      <span>{location.terrain}</span>
                      {location.distance && (
                        <span>• {location.distance}km from start</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoadConditionIcon(location.roadCondition)}
                    {location.status === 'current' && (
                      <div className="flex items-center gap-1 text-blue-600 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>Current</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Road Condition Details */}
                {location.roadCondition && (
                  <div className={`mt-2 px-2 py-1 rounded text-xs ${
                    location.roadCondition === 'Blacktopped' ? 'bg-green-50 text-green-700' :
                    location.roadCondition === 'Gravel' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {location.roadCondition}
                    {location.roadCondition === 'Landslide Risk' && ' - Caution Advised'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Status Badge */}
      <div className="mt-6 p-3 rounded-lg border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Live Status</span>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            roadCondition === 'Blacktopped' ? 'bg-green-100 text-green-800' :
            roadCondition === 'Gravel' ? 'bg-yellow-100 text-yellow-800' :
            roadCondition === 'Landslide Risk' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {roadCondition === 'Blacktopped' ? '✓ Clear' :
             roadCondition === 'Gravel' ? '⚠ Slow Progress' :
             roadCondition === 'Landslide Risk' ? '⚠ Blockage Risk' :
             'Status Unknown'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteMap;
