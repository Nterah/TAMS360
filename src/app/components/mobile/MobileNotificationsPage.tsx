import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  ArrowLeft, 
  Bell, 
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
  Clock
} from "lucide-react";
import { projectId } from "../../../../utils/supabase/info";

interface Notification {
  id: string;
  type: "success" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function MobileNotificationsPage() {
  const navigate = useNavigate();
  const { accessToken } = useContext(AuthContext);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    // Load from localStorage for now (future: fetch from API)
    const stored = localStorage.getItem("notifications");
    if (stored) {
      setNotifications(JSON.parse(stored));
    } else {
      // Demo notifications
      setNotifications([
        {
          id: "1",
          type: "success",
          title: "Inspection Synced",
          message: "Your recent inspection has been successfully synced to the server.",
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          read: false,
        },
        {
          id: "2",
          type: "info",
          title: "New Work Order Assigned",
          message: "You have been assigned to repair guardrail at Route 12.",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          read: false,
        },
        {
          id: "3",
          type: "warning",
          title: "Offline Data Pending",
          message: "3 items are waiting to be synced when you're back online.",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          read: true,
        },
      ]);
    }
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    localStorage.setItem("notifications", JSON.stringify(updated));
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    localStorage.setItem("notifications", JSON.stringify(updated));
  };

  const clearAll = () => {
    if (confirm("Clear all notifications?")) {
      setNotifications([]);
      localStorage.removeItem("notifications");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Notifications</h1>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
          </div>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500">No notifications</p>
              <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`${
                notification.read
                  ? "bg-white dark:bg-slate-800"
                  : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <Badge variant="default" className="text-xs px-2 py-0">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(notification.timestamp)}
                      </div>
                      <div className="flex gap-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-7 text-xs"
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
