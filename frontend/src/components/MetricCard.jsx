import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const MetricCard = ({ 
  value, 
  label, 
  trend, 
  showSparkline = false, 
  showProgress = false,
  progressValue = 0,
  color = '#667eea',
  sparklineData = []
}) => {
  // Generate sample sparkline data if not provided
  const defaultSparklineData = sparklineData.length > 0 ? sparklineData : [
    { value: 20 }, { value: 35 }, { value: 25 }, { value: 45 }, 
    { value: 40 }, { value: 55 }, { value: 50 }, { value: 60 }
  ];

  // Calculate progress percentage
  const progressPercentage = progressValue > 0 ? Math.min(progressValue, 100) : 0;
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <Card 
      sx={{ 
        height: '100%',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #f0f0f0',
        borderRadius: 2,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }
      }}
    >
      <CardContent sx={{ p: 3, position: 'relative' }}>
        {/* Progress Circle (if enabled) */}
        {showProgress && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
            }}
          >
            <svg width="60" height="60">
              {/* Background circle */}
              <circle
                cx="30"
                cy="30"
                r="25"
                fill="none"
                stroke="#f0f0f0"
                strokeWidth="5"
              />
              {/* Progress circle */}
              <circle
                cx="30"
                cy="30"
                r="25"
                fill="none"
                stroke={color}
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 30 30)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
              {/* Percentage text inside circle */}
              <text
                x="30"
                y="35"
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill={color}
              >
                {Math.round(progressValue)}%
              </text>
            </svg>
          </Box>
        )}

        {/* Value */}
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 'bold',
            color: '#2c3e50',
            mb: 0.5,
            fontSize: showProgress ? '2rem' : '2.5rem'
          }}
        >
          {value}
        </Typography>

        {/* Label */}
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#95a5a6',
            fontSize: '0.875rem',
            mb: showSparkline ? 2 : 0
          }}
        >
          {label}
        </Typography>

        {/* Sparkline Chart */}
        {showSparkline && (
          <Box sx={{ mt: 2, height: 40, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={defaultSparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* Trend Indicator */}
        {trend && (
          <Box 
            sx={{ 
              position: 'absolute',
              top: 12,
              right: 12,
              bgcolor: trend >= 0 ? '#d4edda' : '#f8d7da',
              color: trend >= 0 ? '#155724' : '#721c24',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;

