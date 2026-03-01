'use client';

import { useEffect, useState } from 'react';

import type { ProjectListItemDto } from '@shorts/shared-types';

import { createProject, listProjects } from '@/lib/api-client';

import styles from './dashboard.module.css';

export function DashboardClient() {
  const [projects, setProjects] = useState<ProjectListItemDto[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      setProjects(await listProjects());
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load projects';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const onCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const created = await createProject(title.trim());
      setProjects((current) => [created, ...current]);
      setTitle('');
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Failed to create project';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.wrapper}>
      <section className={styles.card}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Create projects and inspect your current API-backed project list.</p>

        <form onSubmit={onCreate} className={styles.form}>
          <input
            className={styles.input}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="New motivational short title"
            aria-label="Project title"
          />
          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create project'}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}
      </section>

      <section className={styles.card}>
        <h2>Projects</h2>
        {loading ? (
          <p className={styles.meta}>Loading projects…</p>
        ) : projects.length === 0 ? (
          <p className={styles.meta}>No projects yet.</p>
        ) : (
          <ul className={styles.list}>
            {projects.map((project) => (
              <li key={project.id}>
                <strong>{project.title}</strong>
                <div className={styles.meta}>
                  Status: {project.status} · Created: {new Date(project.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
