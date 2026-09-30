import React from 'react';

export const ACADEMIC_SECTIONS = [
  'All Courses',
  'Matric 9th',
  'Matric 10th',
  'FSc Part 1',
  'FSc Part 2',
  'BSc / BS',
];

interface AcademicFilterProps {
  selectedSection: string;
  onSelectSection: (section: string) => void;
}

export const AcademicFilter: React.FC<AcademicFilterProps> = ({
  selectedSection,
  onSelectSection,
}) => {
  return (
    <div className="academic-section-nav" role="tablist">
      {ACADEMIC_SECTIONS.map((section) => {
        const isActive = selectedSection === section;
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
  );
};
