"use client";

import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  Truck, 
  MapPin, 
  Mountain,
  Building,
  Users
} from 'lucide-react';

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  type: 'Urban' | 'Highway' | 'Rural';
  status: 'completed' | 'current' | 'upcoming';
  estimatedTime?: string;
  actualTime?: string;
  distance?: string;
  challenges?: string[];
}

interface ProgressTimelineProps {
  currentStage: 'Urban' | 'Highway' | 'Rural';
  roadCondition?: 'Blacktopped' | 'Gravel' | 'Landslide Risk';
  progress: number;
}

const ProgressTimeline: React.FC<ProgressTimelineProps> = ({ 
  currentStage, 
  roadCondition, 
  progress 
}) => {
  const timeline: TimelineStep[] = [
    {
      id: 'urban-departure',
      title: 'Urban Departure',
      description: 'Loading at Kathmandu Warehouse and city navigation',
      type: 'Urban',
      status: 'completed',
      estimatedTime: '30-45 min',
      actualTime: '9:15 AM',
      distance: '0-5 km',
      challenges: ['Traffic congestion', 'Narrow streets']
    },
    {
      id: 'highway-transit',
      title: 'Highway Transit',
      description: 'Prithvi Highway journey towards Nuwakot',
      type: 'Highway',
      status: currentStage === 'Urban' ? 'upcoming' : 
              currentStage === 'Highway' ? 'current' : 'completed',
      estimatedTime: '1.5-2 hours',
      actualTime: currentStage !== 'Urban' ? '10:00 AM' : undefined,
      distance: '5-65 km',
      challenges: roadCondition === 'Landslide Risk' ? ['Landslide risk zones'] : 
                 roadCondition === 'Gravel' ? ['Potholed sections'] : 
                 ['Heavy vehicle traffic']
    },
    {
      id: 'rural-approach',
      title: 'Rural Approach',
      description: 'Hill roads and village access routes',
      type: 'Rural',
      status: currentStage === 'Rural' ? 'current' : 'upcoming',
      estimatedTime: '2-3 hours',
      actualTime: currentStage === 'Rural' ? '12:30 PM' : undefined,
      distance: '65-85 km',
      challenges: ['Steep inclines', 'Narrow mountain roads', 'Limited GPS signal']
    },
    {
      id: 'village-arrival',
      title: 'Village Arrival',
      description: 'Final drop-off at rural village location',
      type: 'Rural',
      status: 'upcoming',
      estimatedTime: '30 min',
      distance: '85+ km',
      challenges: ['Unpaved access roads', 'Manual unloading required']
    }
  ];

  const getStageIcon = (type: string) => {
    switch (type) {
      case 'Urban':
        return <Building className="w-5 h-5" />;
      case 'Highway':
        return <Truck className="w-5 h-5" />;
      case 'Rural':
        return <Mountain className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'current':
        return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'upcoming':
        return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />;
      default:
        return null;
    }
  };

  const getStageColor = (type: string, status: string) => {
    const baseColors = {
      Urban: status === 'completed' ? 'bg-blue-100 border-blue-300' :
             status === 'current' ? 'bg-blue-100 border-blue-400' :
             'bg-gray-50 border-gray-200',
      Highway: status === 'completed' ? 'bg-green-100 border-green-300' :
               status === 'current' ? 'bg-green-100 border-green-400' :
               'bg-gray-50 border-gray-200',
      Rural: status === 'completed' ? 'bg-orange-100 border-orange-300' :
             status === 'current' ? 'bg-orange-100 border-orange-400' :
             'bg-gray-50 border-gray-200'
    };
    return baseColors[type as keyof typeof baseColors] || baseColors.Urban;
  };

  const getConnectorColor = (status: string) => {
    return status === 'completed' ? 'bg-green-400' : 'bg-gray-300';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Journey Progress Timeline
        </h3>
        <div className="text-sm text-gray-600">
          Overall Progress: <span className="font-semibold">{progress}%</span>
        </div>
      </div>

      {/* Vertical Stepper */}
      <div className="relative">
        {timeline.map((step, index) => (
          <div key={step.id} className="flex items-start gap-4 mb-8 last:mb-0">
            {/* Connector Line */}
            {index < timeline.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-20">
                <div className={`w-full h-full ${getConnectorColor(step.status)}`} />
              </div>
            )}

            {/* Step Icon */}
            <div className={`relative z-10 p-3 rounded-full border-2 ${getStageColor(step.type, step.status)}`}>
              {getStageIcon(step.type)}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-800">{step.title}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      step.type === 'Urban' ? 'bg-blue-100 text-blue-700' :
                      step.type === 'Highway' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {step.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                </div>
                {getStatusIcon(step.status)}
              </div>

              {/* Step Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <div>
                    <div className="font-medium">Est: {step.estimatedTime}</div>
                    {step.actualTime && <div>Actual: {step.actualTime}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span>Distance: {step.distance}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  <span>Status: {step.status}</span>
                </div>
              </div>

              {/* Challenges */}
              {step.challenges && step.challenges.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-700 mb-1">Challenges:</div>
                  <div className="flex flex-wrap gap-1">
                    {step.challenges.map((challenge, idx) => (
                      <span 
                        key={idx}
                        className={`px-2 py-1 rounded text-xs ${
                          challenge.includes('Landslide') ? 'bg-red-50 text-red-700' :
                          challenge.includes('Traffic') ? 'bg-yellow-50 text-yellow-700' :
                          'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {challenge}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Stage Progress Bar */}
              {step.status === 'current' && (
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-blue-700">Current Stage Progress</span>
                    <span className="text-blue-600">In Transit</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Road Condition Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <h4 className="font-medium text-gray-800 mb-2">Current Road Conditions</h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              roadCondition === 'Blacktopped' ? 'bg-green-500' :
              roadCondition === 'Gravel' ? 'bg-yellow-500' :
              roadCondition === 'Landslide Risk' ? 'bg-red-500' :
              'bg-gray-400'
            }`} />
            <span className="text-sm text-gray-700">
              {roadCondition || 'Unknown'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {roadCondition === 'Landslide Risk' && '⚠️ Exercise caution, check for updates' :
             roadCondition === 'Gravel' && '⚠️ Reduced speed expected' :
             roadCondition === 'Blacktopped' && '✅ Normal transit conditions' :
             '📡 Monitoring conditions'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTimeline;
