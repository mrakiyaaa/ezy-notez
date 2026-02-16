"use client";

import { useEffect, useState } from "react";
import { authApi } from "../api/auth.api";
import type { AuthUser, Profile } from "@/types/user";

type AuthState = {
	user: AuthUser | null;
	profile: Profile | null;
	isLoading: boolean;
	error: string | null;
};

export const useAuth = () => {
	const [state, setState] = useState<AuthState>({
		user: null,
		profile: null,
		isLoading: true,
		error: null,
	});

	useEffect(() => {
		let isMounted = true;

		const loadUser = async () => {
			try {
				const data = await authApi.getCurrentUser();
				if (!isMounted) return;

				setState({
					user: data.user ?? null,
					profile: data.profile ?? null,
					isLoading: false,
					error: null,
				});
			} catch (error) {
				if (!isMounted) return;

				setState({
					user: null,
					profile: null,
					isLoading: false,
					error: (error as Error).message,
				});
			}
		};

		void loadUser();

		return () => {
			isMounted = false;
		};
	}, []);

	return state;
};
