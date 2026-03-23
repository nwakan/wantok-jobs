import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

/**
 * Line Chart Component - For time series data (applications over time, etc.)
 */
export const ApplicationsOverTime = ({ data, dataKey = 'applications', xKey = 'date' }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={xKey} />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey={dataKey} stroke="#3b82f6" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

/**
 * Bar Chart Component - For categorical data (jobs by category, etc.)
 */
export const JobsByCategory = ({ data, dataKey = 'count', xKey = 'category' }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={xKey} />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey={dataKey} fill="#3b82f6" />
    </BarChart>
  </ResponsiveContainer>
);

/**
 * Pie Chart Component - For status breakdown
 */
export const StatusBreakdown = ({ data, dataKey = 'count', nameKey = 'status' }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        outerRadius={80}
        fill="#8884d8"
        dataKey={dataKey}
        nameKey={nameKey}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

/**
 * Funnel Chart Component - For application pipeline
 * Shows progression through stages
 */
export const ApplicationFunnel = ({ data }) => {
  // Sort data by count descending to create funnel effect
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={sortedData}
        layout="vertical"
        margin={{ left: 100 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis type="category" dataKey="stage" />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Multi-Line Chart - For comparing multiple metrics over time
 */
export const MultiMetricChart = ({ data, metrics }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      {metrics.map((metric, index) => (
        <Line
          key={metric.key}
          type="monotone"
          dataKey={metric.key}
          stroke={COLORS[index % COLORS.length]}
          name={metric.name}
          strokeWidth={2}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
);

/**
 * Stacked Bar Chart - For showing composition
 */
export const StackedMetrics = ({ data, metrics }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      {metrics.map((metric, index) => (
        <Bar
          key={metric.key}
          dataKey={metric.key}
          stackId="a"
          fill={COLORS[index % COLORS.length]}
        />
      ))}
    </BarChart>
  </ResponsiveContainer>
);

export default {
  ApplicationsOverTime,
  JobsByCategory,
  StatusBreakdown,
  ApplicationFunnel,
  MultiMetricChart,
  StackedMetrics,
};
