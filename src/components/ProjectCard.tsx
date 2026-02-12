'use client';

import { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
  eventCount: number;
  onClick: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
}

export default function ProjectCard({ project, eventCount, onClick, onDelete, onToggleStar }: ProjectCardProps) {
  const lastUpdated = new Date(project.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div 
      className="card-hover p-5 group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-100 to-brand-200 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
            className={`p-1.5 rounded-lg transition-all ${
              project.starred
                ? 'text-amber-400 hover:text-amber-500'
                : 'opacity-0 group-hover:opacity-100 text-surface-400 hover:text-amber-400'
            }`}
            title={project.starred ? 'Unstar project' : 'Star project'}
          >
            <svg className="w-4 h-4" fill={project.starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500 transition-all"
            title="Delete project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <h3 className="font-semibold text-surface-900 mb-1 line-clamp-1">{project.name}</h3>
      <p className="text-sm text-surface-500 mb-4">{project.dateRange}</p>
      
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-surface-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {eventCount} {eventCount === 1 ? 'event' : 'events'}
        </span>
        <span className="text-surface-400">Updated {lastUpdated}</span>
      </div>
    </div>
  );
}
