'use client';

import { useEffect, useState } from 'react';
import { useCase } from '@/lib/contexts/case-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import smartAdvocateClient from '@/lib/smartadvocate/client';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  assignedTo: string;
  status: string;
  priority: string;
}

export default function TasksPage() {
  const { currentCase } = useCase();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentCase) {
      loadTasks();
    }
  }, [currentCase]);

  const loadTasks = async () => {
    if (!currentCase) return;

    setLoading(true);
    try {
      // const tasksData = await smartAdvocateClient.makeRequest(`case/${currentCase.caseNumber}/tasks`);
      // setTasks(tasksData || []);
      setTasks([]);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
      case 'resolved':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentCase) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Case Tasks</span>
          <Button size="sm">Add Task</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading tasks...</div>
        ) : tasks.length > 0 ? (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{task.title}</div>
                    <div className="text-sm text-gray-600">{task.description}</div>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Assigned to: {task.assignedTo}</span>
                  <span>Due: {formatDate(task.dueDate)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No tasks found for this case.
          </div>
        )}
      </CardContent>
    </Card>
  );
}