import RetentionPolicyForm from './RetentionPolicyForm';
import ArchivedInternsList from './ArchivedInternsList';
import './RetentionManagement.css';

export default function RetentionManagement() {
  return (
    <section className="retention-management" aria-label="Intern account retention">
      <RetentionPolicyForm />
      <ArchivedInternsList />
    </section>
  );
}
