import React from 'react';

export const DEFAULT_ACADEMIC_SECTIONS = [
  'All Courses',
  'Matric 9th',
  'Matric 10th',
  'FSc Pre-Medical',
  'FSc Pre-Engineering',
  'ICS',
  'I.Com',
  'BSc / BS',
];

interface AcademicFilterProps {
  selectedSection: string;
  onSelectSection: (section: string) => void;
  customClasses?: string[];
}

export const AcademicFilter: React.FC<AcademicFilterProps> = ({
  selectedSection,
  onSelectSection,
  customClasses,
}) => {
  // Merge default classes with custom classes, keeping 'All Courses' first and deduplicating
  const sections = React.useMemo(() => {
    const list: string[] = ['All Courses'];
    const candidates = customClasses && customClasses.length > 0
      ? customClasses
      : DEFAULT_ACADEMIC_SECTIONS.filter((s) => s !== 'All Courses');

    candidates.forEach((c) => {
      const trimmed = c.trim();
      if (trimmed && !list.includes(trimmed)) {
        list.push(trimmed);
      }
    });

    return list;
  }, [customClasses]);

  return (
    <div className="academic-filter-container">
      <div className="academic-section-nav" role="tablist" aria-label="Academic class levels">
        {sections.map((section) => {
          const isActive = selectedSection.toLowerCase() === section.toLowerCase();
          return (
            <button
              key={section}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`academic-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectSection(section)}
            >
              {section}
            </button>
          );
        })}
      </div>
    </div>
  );
};
