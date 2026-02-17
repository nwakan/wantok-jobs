import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifications as notificationsAPI } from '../api';
import { Bell, ExternalLink, Briefcase, FileText, Users, CheckCircle2, X } from 'lucide-react';

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Refresh count every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.count || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll();
      setNotifications(response.data || response || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  // Group similar notifications
  const groupNotifications = (notifs) => {
    const grouped = [];
    const processedIds = new Set();

    notifs.forEach(notif => {
      if (processedIds.has(notif.id)) return;

      // Find similar notifications (same type, created within 24h)
      const similar = notifs.filter(n => 
        !processedIds.has(n.id) &&
        n.type === notif.type &&
        Math.abs(new Date(n.created_at) - new Date(notif.created_at)) < 86400000 // 24 hours
      );

      if (similar.length > 1 && ['new_application', 'profile_viewed', 'new_matching_job'].includes(notif.type)) {
        // Group these notifications
        grouped.push({
          ...notif,
          isGroup: true,
          groupCount: similar.length,
          groupedNotifications: similar
        });
        similar.forEach(n => processedIds.add(n.id));
      } else {
        // Keep as individual
        grouped.push(notif);
        processedIds.add(notif.id);
      }
    });

    return grouped;
  };

  const groupedNotifications = groupNotifications(notifications);

  const handleMarkRead = async (id, notifData) => {
    try {
      await notificationsAPI.markRead(id);
      loadNotifications();
      loadUnreadCount();
      
      // Navigate to relevant page if action link exists
      if (notifData) {
        handleAction(notifData);
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      loadNotifications();
      loadUnreadCount();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleAction = (notifData) => {
    try {
      const data = typeof notifData === 'string' ? JSON.parse(notifData) : notifData;
      
      // Route to relevant page based on notification type
      if (data.jobId) {
        navigate(`/jobs/${data.jobId}`);
      } else if (data.applicationId) {
        navigate(`/dashboard/applications/${data.applicationId}`);
      } else if (data.messageId) {
        navigate(`/dashboard/messages/${data.messageId}`);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to parse notification data:', error);
    }
  };

  const getNotificationIcon = (type) => {
    // Map notification types to icons
    const iconMap = {
      new_application: <FileText className="w-5 h-5 text-blue-600" />,
      application_status_changed: <CheckCircle2 className="w-5 h-5 text-green-600" />,
      new_matching_job: <Briefcase className="w-5 h-5 text-primary-600" />,
      profile_viewed: <Users className="w-5 h-5 text-purple-600" />,
      job_expiring: <ExternalLink className="w-5 h-5 text-amber-600" />,
      welcome_jobseeker: <Bell className="w-5 h-5 text-blue-600" />,
      welcome_employer: <Bell className="w-5 h-5 text-blue-600" />,
    };
    return iconMap[type] || <Bell className="w-5 h-5 text-gray-600" />;
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now - notifTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifTime.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-primary-600 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[20px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
            <div>
              <h3 className="text-lg font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-sm text-gray-500">{unreadCount} unread</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {groupedNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No notifications</p>
                <p className="text-sm mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              groupedNotifications.slice(0, 15).map((notification) => (
                <div key={notification.id}>
                  {notification.isGroup ? (
                    // Grouped notification
                    <div
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        // Mark all grouped notifications as read
                        notification.groupedNotifications.forEach(n => {
                          notificationsAPI.markRead(n.id);
                        });
                        loadNotifications();
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm">
                              {notification.groupCount} {notification.title.split(' ').slice(0, 2).join(' ')}s
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.groupCount} similar notifications
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Individual notification
                    <div
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-400">
                              {formatTime(notification.created_at)}
                            </span>
                            {notification.data && (
                              <button
                                onClick={() => handleMarkRead(notification.id, notification.data)}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                              >
                                View details
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkRead(notification.id);
                              }}
                              className="text-xs text-gray-500 hover:text-gray-700 mt-1 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center flex-shrink-0">
              <button
                onClick={() => {
                  navigate('/dashboard/notifications');
                  setIsOpen(false);
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
