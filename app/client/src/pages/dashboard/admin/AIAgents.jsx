import { useState } from 'react';
import { useToast } from '../../../components/Toast';

export default function AIAgents() {
  const { showToast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Placeholder agent data
  const [agents] = useState([
    {
      id: 'headhunter',
      name: 'Headhunter Agent',
      description: 'Actively searches for candidates matching job requirements',
      status: 'ok',
      last_run: new Date(Date.now() - 3600000).toISOString(),
      run_count: 342,
      success_rate: 98.5,
    },
    {
      id: 'matchmaker',
      name: 'Job Matchmaker',
      description: 'Matches jobseekers with relevant job openings',
      status: 'ok',
      last_run: new Date(Date.now() - 7200000).toISOString(),
      run_count: 1456,
      success_rate: 97.2,
    },
    {
      id: 'town-crier',
      name: 'Town Crier',
      description: 'Sends notifications and job alerts to users',
      status: 'ok',
      last_run: new Date(Date.now() - 1800000).toISOString(),
      run_count: 2891,
      success_rate: 99.1,
    },
    {
      id: 'resume-scanner',
      name: 'Resume Scanner',
      description: 'Analyzes resumes and extracts key information',
      status: 'ok',
      last_run: new Date(Date.now() - 5400000).toISOString(),
      run_count: 687,
      success_rate: 95.8,
    },
    {
      id: 'content-moderator',
      name: 'Content Moderator',
      description: 'Reviews user-generated content for policy violations',
      status: 'ok',
      last_run: new Date(Date.now() - 900000).toISOString(),
      run_count: 523,
      success_rate: 99.7,
    },
  ]);

  const [logs] = useState([
    { time: '2024-02-16 10:35:22', agent: 'headhunter', level: 'INFO', message: 'Started candidate search for Job #1234' },
    { time: '2024-02-16 10:35:45', agent: 'headhunter', level: 'INFO', message: 'Found 12 matching candidates' },
    { time: '2024-02-16 10:36:01', agent: 'matchmaker', level: 'INFO', message: 'Processing 45 new jobseekers' },
    { time: '2024-02-16 10:36:15', agent: 'matchmaker', level: 'INFO', message: 'Generated 127 job recommendations' },
    { time: '2024-02-16 10:37:03', agent: 'town-crier', level: 'INFO', message: 'Sent 89 job alert emails' },
    { time: '2024-02-16 10:38:12', agent: 'resume-scanner', level: 'INFO', message: 'Processed 23 new resumes' },
    { time: '2024-02-16 10:38:45', agent: 'content-moderator', level: 'INFO', message: 'Reviewed 15 job postings' },
  ]);

  const handleRunNow = (agentId) => {
    showToast(`Running ${agentId} agent...`, 'info');
    setTimeout(() => {
      showToast(`${agentId} agent completed successfully`, 'success');
    }, 2000);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Agents Dashboard</h1>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {agents.map(agent => (
          <div
            key={agent.id}
            className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedAgent(agent)}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-gray-900">{agent.name}</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                agent.status === 'ok' ? 'bg-green-100 text-green-800' :
                agent.status === 'error' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {agent.status.toUpperCase()}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4">{agent.description}</p>

            <div className="space-y-2 text-sm text-gray-700 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Last Run:</span>
                <span className="font-medium">
                  {new Date(agent.last_run).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Run Count:</span>
                <span className="font-medium">{agent.run_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Success Rate:</span>
                <span className="font-medium">{agent.success_rate}%</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRunNow(agent.id);
              }}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              Run Now
            </button>
          </div>
        ))}
      </div>

      {/* Agent Detail Modal/Panel */}
      {selectedAgent && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedAgent.name}</h2>
              <p className="text-gray-600 mt-1">{selectedAgent.description}</p>
            </div>
            <button
              onClick={() => setSelectedAgent(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <p className="text-lg font-bold text-green-600 uppercase">{selectedAgent.status}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Last Run</p>
              <p className="text-lg font-bold text-gray-900">
                {new Date(selectedAgent.last_run).toLocaleTimeString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Runs</p>
              <p className="text-lg font-bold text-gray-900">{selectedAgent.run_count}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Success Rate</p>
              <p className="text-lg font-bold text-gray-900">{selectedAgent.success_rate}%</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Activity</h3>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-y-auto max-h-64">
              {logs
                .filter(log => log.agent === selectedAgent.id)
                .map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-400">[{log.time}]</span>{' '}
                    <span className={
                      log.level === 'ERROR' ? 'text-red-400' :
                      log.level === 'WARN' ? 'text-yellow-400' :
                      'text-green-400'
                    }>{log.level}</span>{' '}
                    <span>{log.message}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* System Logs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Logs (Last 20 lines)</h2>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-y-auto max-h-96">
          {logs.map((log, index) => (
            <div key={index} className="mb-1">
              <span className="text-gray-400">[{log.time}]</span>{' '}
              <span className="text-blue-400">[{log.agent}]</span>{' '}
              <span className={
                log.level === 'ERROR' ? 'text-red-400' :
                log.level === 'WARN' ? 'text-yellow-400' :
                'text-green-400'
              }>{log.level}</span>{' '}
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
