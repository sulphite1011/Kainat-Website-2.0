import React, { useState, useEffect, useCallback } from 'react';
import { Hero } from '../components/Hero';
import { AcademicFilter } from '../components/AcademicFilter';
import { CourseCard } from '../components/CourseCard';
import { EmptySection } from '../components/EmptySection';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { CourseSkeletonGrid } from '../components/CourseSkeletonGrid';
import { Course, SiteSettings } from '../types';
import { api } from '../services/api';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface HomeProps {
  settings: SiteSettings;
}

export const Home: React.FC<HomeProps> = ({ settings }) => {
  const { refreshStudentProfile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('All Courses');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeReader, setActiveReader] = useState<{
    course: Course;
    isPaidMode: boolean;
  } | null>(null);

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

    // Real-time Cloud Firestore listener for cross-device course synchronization
    let unsubFirestore: (() => void) | null = null;
    try {
      unsubFirestore = onSnapshot(collection(db, 'courses'), (snap) => {
        if (!snap.empty) {
          const cloudCourses: Course[] = [];
          snap.forEach((d) => cloudCourses.push(d.data() as Course));
          cloudCourses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setCourses(cloudCourses);
        }
      }, (err) => {
        console.warn('Courses listener fallback:', err);
      });
    } catch {}

    // Setup Server-Sent Events listener for real-time catalog & purchase sync if backend available
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('COURSE_CREATED', () => fetchCourses());
      eventSource.addEventListener('COURSE_UPDATED', () => fetchCourses());
      eventSource.addEventListener('COURSE_DELETED', () => fetchCourses());
      eventSource.addEventListener('ORDER_VERIFIED', () => {
        fetchCourses();
        refreshStudentProfile();
      });
    } catch (err) {
      console.warn('SSE not supported or failed to connect:', err);
    }

    return () => {
      unsubFirestore?.();
      eventSource?.close();
    };
  }, [fetchCourses, refreshStudentProfile]);

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
          customClasses={settings.customClasses}
        />

        {/* Course Grid or Empty State with Engaging Skeleton Loader */}
        {isLoading ? (
          <CourseSkeletonGrid />
        ) : filteredCourses.length === 0 ? (
          <EmptySection sectionName={selectedSection} settings={settings} />
        ) : (
          <div className="course-grid">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onOpenDemo={(c) => setActiveReader({ course: c, isPaidMode: false })}
                onOpenReader={(c) => setActiveReader({ course: c, isPaidMode: true })}
              />
            ))}
          </div>
        )}
      </main>

      {/* PDF Reader Modal (Supports both Demo Preview and Full Verified Reader) */}
      {activeReader && (
        <PdfViewerModal
          courseId={activeReader.course.id}
          courseTitle={activeReader.course.title}
          isPaidMode={activeReader.isPaidMode}
          samplePdfUrl={activeReader.course.samplePdfUrl}
          onClose={() => setActiveReader(null)}
        />
      )}
    </div>
  );
};
