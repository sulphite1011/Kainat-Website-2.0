import React, { useState, useEffect, useCallback } from 'react';
import { Hero } from '../components/Hero';
import { AcademicFilter } from '../components/AcademicFilter';
import { CourseCard } from '../components/CourseCard';
import { EmptySection } from '../components/EmptySection';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { Course, SiteSettings } from '../types';
import { api } from '../services/api';

interface HomeProps {
  settings: SiteSettings;
}

export const Home: React.FC<HomeProps> = ({ settings }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('All Courses');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      const data = await api.getCourses();
      setCourses(data);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();

    // Setup Server-Sent Events listener for real-time catalog sync
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('COURSE_CREATED', () => fetchCourses());
      eventSource.addEventListener('COURSE_UPDATED', () => fetchCourses());
      eventSource.addEventListener('COURSE_DELETED', () => fetchCourses());
    } catch (err) {
      console.warn('SSE not supported or failed to connect:', err);
    }

    return () => {
      eventSource?.close();
    };
  }, [fetchCourses]);

  const filteredCourses = selectedSection === 'All Courses'
    ? courses
    : courses.filter((c) => c.class.toLowerCase() === selectedSection.toLowerCase());

  return (
    <div>
      <Hero settings={settings} />

      <main className="container" style={{ padding: '32px 20px 64px' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Explore Academic Notes</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Select your academic level below to view available chapters and solved past papers.
          </p>
        </div>

        {/* Academic Level Filter */}
        <AcademicFilter
          selectedSection={selectedSection}
          onSelectSection={(section) => setSelectedSection(section)}
        />

        {/* Course Grid or Empty State */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>
              Loading courses from server...
            </div>
          </div>
        ) : filteredCourses.length === 0 ? (
          <EmptySection sectionName={selectedSection} settings={settings} />
        ) : (
          <div className="course-grid">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onOpenDemo={(c) => setPreviewCourse(c)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Sample PDF Demo Reader */}
      {previewCourse && (
        <PdfViewerModal
          courseId={previewCourse.id}
          courseTitle={previewCourse.title}
          isPaidMode={false}
          samplePdfUrl={previewCourse.samplePdfUrl}
          onClose={() => setPreviewCourse(null)}
        />
      )}
    </div>
  );
};
