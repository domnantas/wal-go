import { useEffect } from "react";
import { useAuth } from "~/auth/authClient";
import { setZeroAuth } from "~/zero";

export const useSetZeroAuthEffect = () => {
	const { token, user } = useAuth();

	useEffect(() => {
		if (user && token) {
			setZeroAuth({
				jwtToken: token,
				userID: user.id,
			});
		}
	}, [user, token]);
};
