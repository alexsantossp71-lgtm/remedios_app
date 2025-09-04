
import React, { useState } from 'react';
import { Reminder, ReminderStatus } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from '../constants';

interface Props {
    reminders: Reminder[];
}

const Calendar: React.FC<Props> = ({ reminders }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const getMonthData = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday

        const monthData = [];
        for (let i = 0; i < startDayOfWeek; i++) {
            monthData.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            monthData.push(new Date(year, month, i));
        }
        return monthData;
    };

    const monthData = getMonthData();
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const getStatusForDay = (day: Date) => {
        if (!day) return [];
        const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        
        const dayStatuses: { name: string, status: ReminderStatus | 'pending' }[] = [];

        reminders.forEach(reminder => {
            const startDate = new Date(reminder.startDate);
            startDate.setHours(0, 0, 0, 0);

            // Check if reminder is active for this day
            if (day < startDate) return;

            if (reminder.duration.type === 'days') {
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + reminder.duration.days);
                if (day >= endDate) return;
            }

            const diffDays = Math.floor((day.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            if (reminder.frequency.type === 'daily' || (reminder.frequency.type === 'interval' && diffDays % reminder.frequency.days === 0)) {
                const dayHistory = reminder.history[dayKey] || {};
                reminder.times.forEach(time => {
                    const status = dayHistory[time] || 'pending';
                    dayStatuses.push({ name: reminder.medicationName, status: status });
                });
            }
        });

        return dayStatuses;
    };
    
    const isToday = (day: Date) => {
        if (!day) return false;
        const today = new Date();
        return day.getDate() === today.getDate() && day.getMonth() === today.getMonth() && day.getFullYear() === today.getFullYear();
    };

    const renderStatusDots = (day: Date) => {
        const statuses = getStatusForDay(day);
        if (statuses.length === 0) return null;

        const takenCount = statuses.filter(s => s.status === ReminderStatus.TAKEN).length;
        const skippedCount = statuses.filter(s => s.status === ReminderStatus.SKIPPED).length;
        const pendingCount = statuses.filter(s => s.status === 'pending').length;

        return (
            <div className="flex justify-center space-x-1 mt-1">
                {takenCount > 0 && <div className="w-2 h-2 bg-brand-green rounded-full" title={`${takenCount} dose(s) tomada(s)`}></div>}
                {skippedCount > 0 && <div className="w-2 h-2 bg-brand-red rounded-full" title={`${skippedCount} dose(s) ignorada(s)`}></div>}
                {pendingCount > 0 && <div className="w-2 h-2 bg-brand-yellow rounded-full" title={`${pendingCount} dose(s) pendente(s)`}></div>}
            </div>
        );
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700">
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <h3 className="text-lg font-semibold capitalize">
                    {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700">
                    <ChevronRightIcon className="w-6 h-6" />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {weekdays.map(day => (
                    <div key={day} className="font-medium text-sm text-brand-gray-500 dark:text-brand-gray-400 py-2">{day}</div>
                ))}
                {monthData.map((day, index) => (
                    <div key={index} className={`py-2 rounded-lg ${day ? '' : 'bg-transparent'}`}>
                        {day && (
                            <div className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-brand-blue text-white' : ''}`}>
                                {day.getDate()}
                            </div>
                        )}
                        {day && renderStatusDots(day)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Calendar;
