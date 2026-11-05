import { useState } from 'react';
import { createIntern } from '../services/admin.service';

const initialValues = {
	fullName: '',
	email: '',
	mobileNo: '',
	domain: '',
	teamleaderEmail: '',
	startDate: '',
	endDate: '',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values) {
	const errors = {};

	if (!values.fullName.trim()) errors.fullName = 'Full name is required.';
	if (!values.email.trim()) errors.email = 'Email is required.';
	else if (!emailPattern.test(values.email)) errors.email = 'Enter a valid email address.';
	if (!values.mobileNo.trim()) errors.mobileNo = 'Mobile number is required.';
	if (!values.domain.trim()) errors.domain = 'Domain is required.';
	if (!values.teamleaderEmail.trim()) errors.teamleaderEmail = 'Team leader email is required.';
	else if (!emailPattern.test(values.teamleaderEmail)) errors.teamleaderEmail = 'Enter a valid team leader email address.';
	if (!values.startDate) errors.startDate = 'Start date is required.';
	if (!values.endDate) errors.endDate = 'End date is required.';
	else if (values.startDate && values.endDate < values.startDate) errors.endDate = 'End date must be after the start date.';

	return errors;
}

export default function CreateIntern() {
	const [values, setValues] = useState(initialValues);
	const [errors, setErrors] = useState({});
	const [status, setStatus] = useState(null);
	const [loading, setLoading] = useState(false);

	const handleChange = ({ target }) => {
		setValues((current) => ({ ...current, [target.name]: target.value }));
		setErrors((current) => ({ ...current, [target.name]: undefined }));
		setStatus(null);
	};

	const submit = async (event) => {
		event.preventDefault();
		const validationErrors = validate(values);
		setErrors(validationErrors);
		if (Object.keys(validationErrors).length) return;

		setLoading(true);
		setStatus(null);
		try {
			const response = await createIntern({
				...values,
				fullName: values.fullName.trim(),
				email: values.email.trim().toLowerCase(),
				mobileNo: values.mobileNo.trim(),
				domain: values.domain.trim(),
					teamleaderEmail: values.teamleaderEmail.trim().toLowerCase(),
			});
			setValues(initialValues);
			setErrors({});
			setStatus({ type: 'success', message: response.message || 'Intern created successfully.' });
		} catch (error) {
			setStatus({ type: 'error', message: error.message || 'Unable to create intern.' });
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="admin-form-panel">
			<div className="admin-form-heading">
				<span className="admin-form-icon">IN</span>
				<div>
					<h2>Create Intern</h2>
					<p>Register a new intern and assign their internship details.</p>
				</div>
			</div>
			<form className="admin-form" onSubmit={submit} noValidate>
				<div className="admin-form-grid">
					<FormField label="Full name" name="fullName" value={values.fullName} onChange={handleChange} error={errors.fullName} placeholder="John Doe" />
					<FormField label="Email address" name="email" type="email" value={values.email} onChange={handleChange} error={errors.email} placeholder="john@example.com" />
					<FormField label="Mobile number" name="mobileNo" type="tel" value={values.mobileNo} onChange={handleChange} error={errors.mobileNo} placeholder="9876543210" />
					<FormField label="Domain" name="domain" value={values.domain} onChange={handleChange} error={errors.domain} placeholder="Frontend Development" />
					<FormField label="Team leader email" name="teamleaderEmail" type="email" value={values.teamleaderEmail} onChange={handleChange} error={errors.teamleaderEmail} placeholder="leader@example.com" />
					<FormField label="Start date" name="startDate" type="date" value={values.startDate} onChange={handleChange} error={errors.startDate} />
					<FormField label="End date" name="endDate" type="date" value={values.endDate} onChange={handleChange} error={errors.endDate} />
				</div>
				<SubmitButton loading={loading} label="Create intern" />
				{status && <StatusMessage status={status} />}
			</form>
		</section>
	);
}

function FormField({ label, name, type = 'text', value, onChange, error, placeholder }) {
	return (
		<label className="admin-field">
			<span>{label}</span>
			<input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} aria-invalid={Boolean(error)} />
			{error && <small className="field-error">{error}</small>}
		</label>
	);
}

export function SubmitButton({ loading, label }) {
	return <button className="primary admin-submit" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> Creating...</> : label}</button>;
}

export function StatusMessage({ status }) {
	return <p className={`admin-status ${status.type}`} role="status">{status.message}</p>;
}
