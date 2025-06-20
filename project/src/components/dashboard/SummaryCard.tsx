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
    ? formatCurrency(typeof value === 'string' ? parseFloat(value) : value)
    : value;

  return (
    <Card className={`${className} transition-all duration-300 hover:shadow-lg`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{formattedValue}</p>
          </div>
          <div className="p-3 rounded-full bg-blue-50 text-blue-600">
            {icon}
          </div>
        </div>
        
        {typeof change === 'number' && (
          <div className="flex items-center mt-4">
            <span className={`flex items-center text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              {Math.abs(change)}%
            </span>
            <span className="ml-2 text-sm text-gray-500">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SummaryCard;