import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface SummaryCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  change?: number;
  isCurrency?: boolean;
  className?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon,
  change,
  isCurrency = false,
  className = '',
}) => {
  const formattedValue = isCurrency
    ? formatCurrency(
        typeof value === 'string' ? parseFloat(value) : value,
        'GHS',
        'en-GH',
        2
      )
    : value;

  return (
    <Card className={`${className} transition-all duration-300 hover:shadow-lg`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3">
          {/* min-w-0 lets this column actually shrink inside the flex row instead of forcing
              an overflow that Card's overflow-hidden then visually clips. The value stays on
              one line (never wraps or truncates - hiding digits on a money figure would be
              misleading) at a smaller, fixed size that comfortably fits large amounts. */}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-dark-text whitespace-nowrap">{formattedValue}</p>
          </div>
          <div className="flex-shrink-0 p-3 rounded-full bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
            {icon}
          </div>
        </div>

        {typeof change === 'number' && (
          <div className="flex items-center mt-4">
            <span className={`flex items-center text-sm ${change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              {Math.abs(change)}%
            </span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SummaryCard;