import { createContext, useEffect, useState } from "react";
import { getProfile } from "../services/intern.api";
import { useAuth } from "../../auth/hooks/useAuth";

// Context exports are intentionally colocated with their provider for consumers.
// eslint-disable-next-line react-refresh/only-export-components
export const InternContext = createContext(null);

export function InternProvider({ children }) {
	const { user, loading: authLoading } = useAuth();
	const [profile, setProfile] = useState(null);
	const [archiveNotice, setArchiveNotice] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchProfile = async () => {
		setLoading(true);
		setError(null);

		try {
			const data = await getProfile();
			setProfile(data.user);
			setArchiveNotice(data.archiveNotice || null);
			return data.user;
		} catch (err) {
			setError(err.message || "Unable to load profile");
			throw err;
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!authLoading && user?.role === "intern") {
			let cancelled = false;
			Promise.resolve()
				.then(() => {
					if (cancelled) return null;
					setLoading(true);
					setError(null);
					return getProfile();
				})
				.then((data) => {
					if (!cancelled && data) {
						setProfile(data.user);
						setArchiveNotice(data.archiveNotice || null);
					}
				})
				.catch((err) => {
					if (!cancelled) setError(err.message || "Unable to load profile");
				})
				.finally(() => {
					if (!cancelled) setLoading(false);
				});
			return () => {
				cancelled = true;
			};
		}
	}, [authLoading, user?.role]);

	return (
		<InternContext.Provider value={{ profile, archiveNotice, loading, error, fetchProfile }}>
			{children}
		</InternContext.Provider>
	);
}
