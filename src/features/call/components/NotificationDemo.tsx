import React, { useState } from 'react';
import { useCallNotifications } from '@/hooks';
import { CallNotificationData } from '@/features/call/services/notification.service';
import { NotificationSettings } from '@/features/call/components/NotificationSettings';

export interface NotificationDemoProps {
  className?: string;
}

/**
 * Demo component for testing call notification system
 */
export const NotificationDemo: React.FC<NotificationDemoProps> = ({
  className = ''
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [testCallData] = useState<CallNotificationData>({
    callId: 'demo-call-123',
    callType: 'video',
    callerName: 'John Doe',
    callerAvatar: undefined,
    timestamp: Date.now()
  });

  const {
    permissionStatus,
    isSupported,
    soundsEnabled,
    volume,
    requestPermission,
    showIncomingCall,
    showCallStatus,
    closeAllNotifications,
    playSound,
    stopSound,
    stopAllSounds,
    toggleSounds,
    setVolume,
    isSoundPlaying
  } = useCallNotifications({
    onNotificationClick: (action, callData) => {

      if (action === 'answer') {
        showCallStatus('Call Answered', 'Demo call accepted via notification');
      } else if (action === 'decline') {
        showCallStatus('Call Declined', 'Demo call declined via notification');
      }
    }
  });

  const handleTestNotification = async () => {
    await showIncomingCall(testCallData.callerName, testCallData);
  };

  const handleTestSound = async (soundType: 'incoming' | 'outgoing' | 'connected' | 'ended' | 'busy') => {
    if (isSoundPlaying(soundType)) {
      stopSound(soundType);
    } else {
      await playSound(soundType, { duration: 3000 });
    }
  };

  const getPermissionStatusDisplay = () => {
    switch (permissionStatus) {
      case 'granted':
        return { text: 'Granted', color: 'text-green-600', icon: '✓' };
      case 'denied':
        return { text: 'Denied', color: 'text-red-600', icon: '✗' };
      default:
        return { text: 'Not requested', color: 'text-yellow-600', icon: '?' };
    }
  };

  const permissionDisplay = getPermissionStatusDisplay();

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Call Notification System Demo
        </h2>

        {/* Permission Status */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Permission Status</h3>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${permissionDisplay.color}`}>
              <span className="text-lg">{permissionDisplay.icon}</span>
              <span className="font-medium">{permissionDisplay.text}</span>
            </div>
            <span className="text-sm text-gray-500">
              Browser Support: {isSupported ? 'Yes' : 'No'}
            </span>
          </div>
          
          {permissionStatus !== 'granted' && isSupported && (
            <button
              onClick={requestPermission}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Request Permission
            </button>
          )}
        </div>

        {/* Notification Tests */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Notification Tests</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleTestNotification}
                disabled={!isSupported}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Test Incoming Call Notification
              </button>
              <span className="text-sm text-gray-500">
                Shows incoming call notification with actions
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => showCallStatus('Test Status', 'This is a test status notification')}
                disabled={!isSupported}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Test Status Notification
              </button>
              <span className="text-sm text-gray-500">
                Shows call status notification
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={closeAllNotifications}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Close All Notifications
              </button>
              <span className="text-sm text-gray-500">
                Closes all active notifications
              </span>
            </div>
          </div>
        </div>

        {/* Sound Tests */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Sound Tests</h3>
          
          <div className="flex items-center space-x-4 mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={soundsEnabled}
                onChange={toggleSounds}
                className="rounded"
              />
              <span className="text-sm">Enable sounds</span>
            </label>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm">Volume:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                disabled={!soundsEnabled}
                className="w-20"
              />
              <span className="text-sm w-8">{Math.round(volume * 100)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { type: 'incoming', label: 'Incoming Call', color: 'bg-blue-600 hover:bg-blue-700' },
              { type: 'outgoing', label: 'Outgoing Call', color: 'bg-green-600 hover:bg-green-700' },
              { type: 'connected', label: 'Call Connected', color: 'bg-purple-600 hover:bg-purple-700' },
              { type: 'ended', label: 'Call Ended', color: 'bg-gray-600 hover:bg-gray-700' },
              { type: 'busy', label: 'Busy Tone', color: 'bg-red-600 hover:bg-red-700' }
            ].map(({ type, label, color }) => (
              <button
                key={type}
                onClick={() => handleTestSound(type as any)}
                disabled={!soundsEnabled}
                className={`px-3 py-2 text-white text-sm rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ${
                  isSoundPlaying(type as any) ? 'bg-yellow-600 hover:bg-yellow-700' : color
                }`}
              >
                {isSoundPlaying(type as any) ? `Stop ${label}` : `Play ${label}`}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center space-x-3">
            <button
              onClick={stopAllSounds}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Stop All Sounds
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Settings</h3>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            {showSettings ? 'Hide' : 'Show'} Notification Settings
          </button>
        </div>

        {showSettings && (
          <div className="border-t pt-6">
            <NotificationSettings onClose={() => setShowSettings(false)} />
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-700">
          <h4 className="font-medium mb-2">Instructions:</h4>
          <ul className="space-y-1">
            <li>• First grant notification permission if not already granted</li>
            <li>• Test incoming call notification to see browser notification with actions</li>
            <li>• Enable sounds and test different call sound types</li>
            <li>• Adjust volume and settings as needed</li>
            <li>• Sounds are generated programmatically using Web Audio API</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotificationDemo;