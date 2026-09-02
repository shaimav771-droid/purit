import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Wrench, 
  Settings2, 
  Truck, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  MapPin, 
  User, 
  Edit3, 
  Trash2, 
  Check, 
  CalendarDays, 
  ArrowRight,
  Sparkles,
  ExternalLink,
  MessageCircle,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Layers,
  CircleCheck,
  Circle
} from 'lucide-react';
import { Activity, ActivityStatus, ActivityType, ActivityTask } from '../../types';
import { formatDate, getTodayString } from '../../lib/dateUtils';
import { 
  normalizeTasksFromActivity, 
  getActivityUrgency, 
  normalizeTaskTypeName,
  getCustomerCanonicalKey
} from '../../lib/activityUtils';
import { motion, AnimatePresence } from 'motion/react';

type FilterTab = 'pending' | 'today' | 'overdue' | 'upcoming' | 'completed' | 'all';

export const ActivitiesView: React.FC = () => {
  const { 
    activities, 
    markActivityFinished, 
    reopenActivity,
    toggleActivityTask,
    updateActivity,
    setIsAddActivityModalOpen, 
    setSelectedActivityType, 
    setSelectedActivityForEdit,
    deleteActivity,
    customers,
    setSelectedCustomerId,
    setActiveTab
  } = useApp();

  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('pending');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [viewingNoteActivity, setViewingNoteActivity] = useState<Activity | null>(null);

  const todayStr = getTodayString();

  // Activity counts for quick badge counters
  const counts = useMemo(() => {
    let overdueCount = 0;
    let todayCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let pendingCount = 0;

    activities.forEach(a => {
      if (a.status === 'completed') {
        completedCount++;
      } else {
        pendingCount++;
        const urgency = getActivityUrgency(a);
        if (urgency.status === 'overdue') overdueCount++;
        else if (urgency.status === 'today') todayCount++;
        else if (urgency.status === 'upcoming') upcomingCount++;
      }
    });

    return {
      total: activities.length,
      pending: pendingCount,
      overdue: overdueCount,
      today: todayCount,
      upcoming: upcomingCount,
      completed: completedCount,
    };
  }, [activities]);

  // Filtered & searched activities list
  const filteredActivities = useMemo(() => {
    const list = activities.filter(activity => {
      const urgency = getActivityUrgency(activity);
      const tasks = normalizeTasksFromActivity(activity);
      const isCompleted = activity.status === 'completed';

      // 1. Tab filter
      if (activeFilterTab === 'pending' && isCompleted) return false;
      if (activeFilterTab === 'completed' && !isCompleted) return false;
      if (activeFilterTab === 'today' && (isCompleted || urgency.status !== 'today')) return false;
      if (activeFilterTab === 'overdue' && (isCompleted || urgency.status !== 'overdue')) return false;
      if (activeFilterTab === 'upcoming' && (isCompleted || urgency.status !== 'upcoming')) return false;

      // 2. Type filter (matches if this visit contains the filtered task type)
      if (selectedTypeFilter !== 'all') {
        const filterNorm = normalizeTaskTypeName(selectedTypeFilter).toLowerCase();
        const hasMatchingTask = tasks.some(
          t => normalizeTaskTypeName(t.type).toLowerCase().includes(filterNorm)
        );
        const rawTypes = (activity.activityType || activity.type || '').toLowerCase();
        if (!hasMatchingTask && !rawTypes.includes(filterNorm)) {
          return false;
        }
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = activity.customerName.toLowerCase().includes(q);
        const matchesRemarks = activity.remarks?.toLowerCase().includes(q) || false;
        const matchesTasks = tasks.some(
          t => t.type.toLowerCase().includes(q) || t.remarks?.toLowerCase().includes(q)
        );
        const matchesPhone = activity.customerPhone?.includes(q) || false;
        const matchesAddress = activity.customerAddress?.toLowerCase().includes(q) || false;
        const matchesStaff = activity.assignedTo?.toLowerCase().includes(q) || false;

        if (!matchesName && !matchesRemarks && !matchesTasks && !matchesPhone && !matchesAddress && !matchesStaff) {
          return false;
        }
      }

      return true;
    });

    // Sort: If viewing completed history, show newest completed first; if pending, show overdue/closest due first
    const sorted = [...list].sort((a, b) => {
      if (activeFilterTab === 'completed' || (a.status === 'completed' && b.status === 'completed')) {
        const timeA = new Date(a.completedAt || a.dueDate).getTime();
        const timeB = new Date(b.completedAt || b.dueDate).getTime();
        return timeB - timeA;
      }
      const timeA = new Date(a.dueDate).getTime();
      const timeB = new Date(b.dueDate).getTime();
      return timeA - timeB;
    });

    // Guarantee 100% uniqueness: 1 Card per Restaurant and 100% distinct activity.id
    const seenActivityIds = new Set<string>();
    const seenRestaurantKeys = new Set<string>();

    return sorted.filter((item) => {
      if (!item || !item.id) return false;
      if (seenActivityIds.has(item.id)) return false;

      const canonical = getCustomerCanonicalKey(item.customerId, item.customerName, customers);
      const restaurantKey = item.status === 'completed' 
        ? `done_${canonical.key}_${item.id}` 
        : `active_${canonical.key}`;

      if (seenRestaurantKeys.has(restaurantKey)) return false;

      seenActivityIds.add(item.id);
      seenRestaurantKeys.add(restaurantKey);
      return true;
    });
  }, [activities, activeFilterTab, selectedTypeFilter, searchQuery, customers]);

  const handleOpenAddModalWithType = (type?: ActivityType) => {
    if (type) setSelectedActivityType(type);
    setIsAddActivityModalOpen(true);
  };

  const handleNavigateToCustomer = (customerId?: string) => {
    if (!customerId || customerId === 'adhoc') return;
    setSelectedCustomerId(customerId);
    setActiveTab('customers');
  };

  const getTaskIcon = (type: string) => {
    const norm = normalizeTaskTypeName(type);
    if (norm === 'Dispenser Fitting') return <Wrench className="w-3 h-3 shrink-0 text-emerald-600" />;
    if (norm === 'Dispenser Service') return <Settings2 className="w-3 h-3 shrink-0 text-indigo-600" />;
    if (norm === 'Delivery') return <Truck className="w-3 h-3 shrink-0 text-sky-600" />;
    return <Layers className="w-3 h-3 shrink-0 text-slate-600" />;
  };

  const getTaskShortName = (type: string) => {
    const norm = normalizeTaskTypeName(type);
    if (norm === 'Dispenser Fitting') return 'Fitting';
    if (norm === 'Dispenser Service') return 'Service';
    if (norm === 'Delivery') return 'Delivery';
    return type;
  };

  return (
    <div id="activities-view" className="space-y-3 pb-16">
      
      {/* Brand Header for First Screen / Landing Page */}
      <div className="flex items-center gap-2.5 pt-0.5 pb-1">
        <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black tracking-tight text-base shadow-sm">
          P
        </div>
        <span className="font-black text-slate-900 text-xl tracking-tight">PURIT</span>
      </div>

      {/* 1. TOP SECTION — SCHEDULED ACTIVITY (Compact Operational Card) */}
      <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-4 shadow-md border border-slate-800">
        
        {/* Card Header: Title + Active / History Switcher Tabs */}
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${activeFilterTab === 'completed' ? 'bg-emerald-400' : 'bg-emerald-400 animate-pulse'}`} />
            <h1 className="text-xs sm:text-sm font-black tracking-wider uppercase text-slate-100 truncate">
              {activeFilterTab === 'completed' ? 'FINISHED HISTORY' : 'OPERATIONAL VISITS'}
            </h1>
          </div>

          {/* History / Active Tabs */}
          <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80 shrink-0 text-[11px] font-bold">
            <button
              type="button"
              id="scheduled-active-tab-btn"
              onClick={() => setActiveFilterTab('pending')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeFilterTab !== 'completed'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Active</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeFilterTab !== 'completed' ? 'bg-emerald-950/30 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}>
                {counts.pending}
              </span>
            </button>

            <button
              type="button"
              id="scheduled-history-tab-btn"
              onClick={() => setActiveFilterTab('completed')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                activeFilterTab === 'completed'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>History</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeFilterTab === 'completed' ? 'bg-emerald-950/30 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}>
                {counts.completed}
              </span>
            </button>
          </div>
        </div>

        {/* 3 Compact Quick Action Buttons in 1 Row */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <button
            onClick={() => handleOpenAddModalWithType('Dispenser Fitting')}
            className="flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl bg-slate-800 hover:bg-emerald-950/80 hover:border-emerald-500/50 active:scale-95 text-slate-100 text-xs font-bold transition-all border border-slate-700/80 shadow-2xs cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Fitting</span>
          </button>

          <button
            onClick={() => handleOpenAddModalWithType('Dispenser Service')}
            className="flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl bg-slate-800 hover:bg-indigo-950/80 hover:border-indigo-500/50 active:scale-95 text-slate-100 text-xs font-bold transition-all border border-slate-700/80 shadow-2xs cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Service</span>
          </button>

          <button
            onClick={() => handleOpenAddModalWithType('Delivery')}
            className="flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl bg-slate-800 hover:bg-sky-950/80 hover:border-sky-500/50 active:scale-95 text-slate-100 text-xs font-bold transition-all border border-slate-700/80 shadow-2xs cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">Delivery</span>
          </button>
        </div>

        {/* Small Expand / Collapse Downward Chevron Bar */}
        <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-center">
          <button
            onClick={() => setIsStatsExpanded(!isStatsExpanded)}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-200 py-0.5 px-3 rounded-full hover:bg-slate-800/70 transition-all cursor-pointer"
          >
            <span>{isStatsExpanded ? 'Hide Filters & Search' : 'Filters & Search'}</span>
            {counts.overdue > 0 && !isStatsExpanded && activeFilterTab !== 'completed' && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-500/40">
                {counts.overdue} Overdue
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isStatsExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* EXPANDABLE SECTION: Stats, Filter Tabs & Search */}
        <AnimatePresence>
          {isStatsExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden pt-3 space-y-3"
            >
              {/* Operational Stats Grid */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => setActiveFilterTab('overdue')}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    activeFilterTab === 'overdue'
                      ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-500'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <p className="text-[10px] font-semibold text-rose-400">Overdue</p>
                  <p className="text-base font-black">{counts.overdue}</p>
                </button>

                <button
                  onClick={() => setActiveFilterTab('today')}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    activeFilterTab === 'today'
                      ? 'bg-amber-950/80 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <p className="text-[10px] font-semibold text-amber-400">Today</p>
                  <p className="text-base font-black">{counts.today}</p>
                </button>

                <button
                  onClick={() => setActiveFilterTab('upcoming')}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    activeFilterTab === 'upcoming'
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <p className="text-[10px] font-semibold text-indigo-400">Upcoming</p>
                  <p className="text-base font-black">{counts.upcoming}</p>
                </button>

                <button
                  onClick={() => setActiveFilterTab('completed')}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    activeFilterTab === 'completed'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <p className="text-[10px] font-semibold text-emerald-400">Done</p>
                  <p className="text-base font-black">{counts.completed}</p>
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <button
                  onClick={() => setActiveFilterTab('pending')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                    activeFilterTab === 'pending' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Active ({counts.pending})
                </button>
                <button
                  onClick={() => setActiveFilterTab('today')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                    activeFilterTab === 'today' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Today ({counts.today})
                </button>
                <button
                  onClick={() => setActiveFilterTab('overdue')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                    activeFilterTab === 'overdue' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Overdue ({counts.overdue})
                </button>
                <button
                  onClick={() => setActiveFilterTab('upcoming')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                    activeFilterTab === 'upcoming' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Upcoming ({counts.upcoming})
                </button>
                <button
                  onClick={() => setActiveFilterTab('completed')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                    activeFilterTab === 'completed' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Completed ({counts.completed})
                </button>
                <button
                  onClick={() => setActiveFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                    activeFilterTab === 'all' ? 'bg-slate-200 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  All ({counts.total})
                </button>
              </div>

              {/* Search & Type Filter Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search restaurant, task, note, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <select
                    value={selectedTypeFilter}
                    onChange={(e) => setSelectedTypeFilter(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Task Types</option>
                    <option value="Dispenser Fitting">Dispenser Fitting</option>
                    <option value="Dispenser Service">Dispenser Service</option>
                    <option value="Delivery">Delivery</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* 2. OPERATIONAL VISIT CARDS LIST (1 RESTAURANT + 1 DATE = 1 CARD) */}
      <div className="space-y-2.5">
        {filteredActivities.map((activity, index) => {
          const urgency = getActivityUrgency(activity);
          const isCompleted = activity.status === 'completed';
          const tasks = normalizeTasksFromActivity(activity);
          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(t => t.status === 'completed').length;
          const isPartiallyDone = completedTasks > 0 && completedTasks < totalTasks;

          return (
            <motion.div
              key={`stop-${activity.canonicalKey || activity.id}-${index}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                urgency.status === 'overdue'
                  ? 'border-rose-300/90 ring-1 ring-rose-500/10'
                  : urgency.status === 'today'
                  ? 'border-amber-300/90 ring-1 ring-amber-500/10'
                  : isCompleted
                  ? 'border-slate-200 bg-slate-50/70 opacity-90'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-3 sm:p-3.5 space-y-2.5">
                  
                  {/* Top Line: [Urgency Dot + Restaurant Name] and [Due Date Badge + Call/Maps Buttons] */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {/* Urgency Status Dot */}
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        urgency.status === 'overdue'
                          ? 'bg-rose-600 animate-pulse'
                          : urgency.status === 'today'
                          ? 'bg-amber-500'
                          : isCompleted
                          ? 'bg-emerald-600'
                          : 'bg-indigo-500'
                      }`} />

                      {/* Restaurant Name */}
                      <h3
                        onClick={() => handleNavigateToCustomer(activity.customerId)}
                        className={`font-black text-slate-900 text-sm tracking-tight truncate ${
                          activity.customerId && activity.customerId !== 'adhoc'
                            ? 'cursor-pointer hover:text-emerald-700 active:underline'
                            : ''
                        }`}
                        title={activity.customerName}
                      >
                        {activity.customerName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Due / Urgency Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 ${
                        urgency.status === 'overdue'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : urgency.status === 'today'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {urgency.status === 'overdue' && <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />}
                        {urgency.status === 'today' && <Clock className="w-3 h-3 text-amber-600 shrink-0" />}
                        <span>{isCompleted ? 'Finished' : urgency.label}</span>
                      </span>

                      {/* Phone Call */}
                      {activity.customerPhone && (
                        <a
                          href={`tel:${activity.customerPhone}`}
                          className="p-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                          title={`Call ${activity.customerPhone}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Middle Line: Operational Task Badges / Chips with Individual Checkbox Toggles */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {tasks.map((task, taskIndex) => {
                          const taskDone = task.status === 'completed';
                          const normType = normalizeTaskTypeName(task.type);

                          return (
                            <button
                              key={`subtask-${activity.id}-${task.id || task.type}-${taskIndex}`}
                              type="button"
                              onClick={() => toggleActivityTask(activity.id, task.id)}
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none ${
                                taskDone
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 line-through opacity-80'
                                  : normType === 'Dispenser Fitting'
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                                  : normType === 'Dispenser Service'
                                  ? 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                                  : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'
                              }`}
                              title={taskDone ? `Task completed. Tap to reopen.` : `Tap to mark ${getTaskShortName(task.type)} completed.`}
                            >
                              {taskDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0 hover:text-emerald-600" />
                              )}
                              <span>{getTaskShortName(task.type)}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Date & Progress Indicator */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 shrink-0">
                        <span>{formatDate(activity.dueDate)}</span>
                        {totalTasks > 1 && (
                          <span className={`px-1.5 py-0.2 rounded-md font-bold text-[10px] ${
                            isCompleted 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isPartiallyDone 
                              ? 'bg-indigo-100 text-indigo-800' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {completedTasks}/{totalTasks}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes / Remarks Row (Compact) */}
                  {activity.remarks && (
                    <button
                      type="button"
                      id={`activity-note-btn-${activity.id}`}
                      onClick={() => setViewingNoteActivity(activity)}
                      className="w-full text-left text-[11px] text-slate-700 leading-tight bg-slate-50 hover:bg-slate-100 active:bg-slate-200/80 px-2.5 py-1.5 rounded-xl border border-slate-200/80 transition-colors flex items-center justify-between gap-1.5 cursor-pointer group"
                      title="Tap to view visit instructions"
                    >
                      <div className="truncate flex items-center gap-1.5 min-w-0">
                        <FileText className="w-3 h-3 text-slate-400 shrink-0 group-hover:text-emerald-600 transition-colors" />
                        <span className="font-bold text-slate-600 shrink-0">Note:</span>
                        <span className="truncate text-slate-700">{activity.remarks}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded shrink-0 border border-emerald-200/60">
                        View
                      </span>
                    </button>
                  )}

                  {/* Bottom Line: Secondary Actions (Edit/Delete) + Primary [ Mark Visit Finished ] */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    
                    {/* Left: Edit & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedActivityForEdit(activity)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-semibold transition-colors cursor-pointer"
                        title="Edit Visit & Tasks"
                      >
                        <Edit3 className="w-3 h-3 text-slate-400" />
                        <span>Edit Visit</span>
                      </button>

                      <button
                        onClick={() => deleteActivity(activity.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Visit"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Right: Mark Visit Finished / Finished Status & Reopen */}
                    <div className="flex items-center gap-1.5">
                      {!isCompleted ? (
                        <button
                          onClick={() => markActivityFinished(activity.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Visit Finished</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-emerald-800 text-[11px] font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Finished {activity.completedAt ? `(${formatDate(activity.completedAt)})` : ''}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => reopenActivity(activity.id)}
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-slate-200/80"
                            title="Reopen visit and mark tasks as active"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span className="hidden sm:inline">Reopen</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              </motion.div>
            );
          })}

        {filteredActivities.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3 my-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                {activeFilterTab === 'completed' ? 'No Completed Visits' : 'No Pending Visits'}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {activeFilterTab === 'overdue' 
                  ? 'Great! There are no overdue maintenance or delivery visits.'
                  : 'All operational visits are up to date. Schedule a new task above.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. FULL NOTE VIEW MODAL POPUP */}
      <AnimatePresence>
        {viewingNoteActivity && (
          <div 
            id="activity-note-modal-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
            onClick={() => setViewingNoteActivity(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-4"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 truncate">
                      {viewingNoteActivity.customerName}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Visit on {formatDate(viewingNoteActivity.dueDate)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="close-note-modal-btn"
                  onClick={() => setViewingNoteActivity(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close Note"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Task List & Full Note Text */}
              <div className="p-5 space-y-4">
                
                {/* Tasks in this visit */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tasks Scheduled for this Visit
                  </label>
                  <div className="space-y-1">
                    {normalizeTasksFromActivity(viewingNoteActivity).map((t, tIdx) => (
                      <div 
                        key={`view-task-${t.id || t.type}-${tIdx}`} 
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
                          t.status === 'completed'
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {getTaskIcon(t.type)}
                          <span className="font-bold">{t.type}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          t.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status === 'completed' ? 'Done' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Visit Instructions & Remarks
                  </label>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap break-words max-h-48 overflow-y-auto select-text">
                    {viewingNoteActivity.remarks || 'No remarks recorded for this visit.'}
                  </div>
                </div>

                {/* Additional Context Snippets */}
                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/60 p-3 rounded-2xl border border-slate-150">
                  {viewingNoteActivity.customerAddress && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight text-slate-600">{viewingNoteActivity.customerAddress}</span>
                    </div>
                  )}

                  {viewingNoteActivity.customerPhone && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-700">{viewingNoteActivity.customerPhone}</span>
                      </div>
                      <a
                        href={`tel:${viewingNoteActivity.customerPhone}`}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 inline-flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        Call
                      </a>
                    </div>
                  )}

                  {viewingNoteActivity.assignedTo && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Assigned: <strong className="text-slate-700">{viewingNoteActivity.assignedTo}</strong></span>
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      const act = viewingNoteActivity;
                      setViewingNoteActivity(null);
                      setSelectedActivityForEdit(act);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Visit</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {viewingNoteActivity.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => {
                          const actId = viewingNoteActivity.id;
                          setViewingNoteActivity(null);
                          markActivityFinished(actId);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Finished</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setViewingNoteActivity(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
