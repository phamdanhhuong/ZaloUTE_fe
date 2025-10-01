import React, { useState, useEffect } from 'react';
import useCallNotifications from '../hooks/useCallNotifications';

export interface NotificationSettingsProps {
  className?: string;
  onClose?: () => void;
}

/**
 * Component for managing call notification settings
 */
export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  className = '',
  onClose
}) => {
  const {
    permissionStatus,
    isSupported,
    soundsEnabled,
    volume,
    requestPermission,
    toggleSounds,
    setVolume,
    playSound,
    stopSound,
    isSoundPlaying
  } = useCallNotifications();

  const [isTestingSound, setIsTestingSound] = useState<string | null>(null);

  const handlePermissionRequest = async () => {
    try {
      const permission = await requestPermission();
      if (permission === 'granted') {
        // Show success message or update UI

      }
    } catch (error) {
      console.error('Failed to request permission:', error);
    }
  };

  const handleTestSound = async (soundType: 'incoming' | 'outgoing' | 'connected' | 'ended' | 'busy') => {
    if (isTestingSound === soundType) {
      stopSound(soundType);
      setIsTestingSound(null);
    } else {
      if (isTestingSound) {
        stopSound(isTestingSound as any);
      }
      setIsTestingSound(soundType);
      await playSound(soundType, { duration: 3000 });
      setTimeout(() => setIsTestingSound(null), 3000);
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return { text: 'Enabled', color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'denied':
        return { text: 'Blocked', color: 'text-red-600', bgColor: 'bg-red-100' };
      default:
        return { text: 'Not requested', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    }
  };

  const permissionInfo = getPermissionStatusText();

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 w-full max-w-md ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Notification Settings
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Browser Notifications */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">Browser Notifications</h4>
        
        {!isSupported && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
            <p className="text-sm text-yellow-800">
              Your browser doesn't support notifications or they are disabled.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <div className="flex items-center">
            <div className="flex items-center">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${permissionInfo.bgColor} ${permissionInfo.color}`}>
                {permissionInfo.text}
              </div>
            </div>
            <span className="ml-3 text-sm text-gray-600">
              Show incoming call notifications
            </span>
          </div>
          
          {permissionStatus !== 'granted' && isSupported && (
            <button
              onClick={handlePermissionRequest}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
            >
              Enable
            </button>
          )}
        </div>

        {permissionStatus === 'denied' && (
          <p className="text-xs text-gray-500 mt-2">
            To enable notifications, please allow them in your browser settings for this site.
          </p>
        )}
      </div>

      {/* Sound Settings */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">Sound Settings</h4>
        
        <div className="space-y-4">
          {/* Enable/Disable Sounds */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Enable call sounds</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={soundsEnabled}
                onChange={toggleSounds}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Volume Control */}
          {soundsEnabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Volume</span>
                <span className="text-sm text-gray-500">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          )}

          {/* Sound Test Buttons */}
          {soundsEnabled && (
            <div className="space-y-2">
              <span className="text-sm text-gray-600">Test sounds:</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'incoming', label: 'Incoming' },
                  { type: 'outgoing', label: 'Outgoing' },
                  { type: 'connected', label: 'Connected' },
                  { type: 'ended', label: 'Ended' }
                ].map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => handleTestSound(type as any)}
                    className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                      isTestingSound === type
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {isTestingSound === type ? 'Stop' : label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Browser notifications appear even when the tab is not active</p>
        <p>• Call sounds help you notice incoming calls</p>
        <p>• Settings are saved locally in your browser</p>
      </div>
    </div>
  );
};

export default NotificationSettings;