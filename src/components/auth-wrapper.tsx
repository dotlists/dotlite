import { useAuthActions } from "@convex-dev/auth/react";
import {
  Authenticated,
  Unauthenticated,
  useConvexAuth,
  useQuery,
} from "convex/react";
import { Button } from "./ui/button";
import { GoogleLogo } from "./google";
import { api } from "@/../convex/_generated/api";

export default function AuthWrapper(props: { Content: React.ComponentType }) {
  const { isAuthenticated } = useConvexAuth();
  const { signOut, signIn } = useAuthActions();
  const { viewer, image } = useQuery(api.myFunctions.getUser) ?? {};
  return (
    <>
      <main>
        <Authenticated>
          <div className="fixed w-full top-0 p-2 bg-white z-[1000]">
            <div className="flex">
              <img
                src={image ?? undefined}
                className="w-7 h-7 rounded-full my-auto"
              ></img>
              <p className="my-auto ml-2 mr-auto">{viewer ?? "Anonymous"}</p>
              {isAuthenticated && (
                <Button variant="fancy" onClick={() => void signOut()}>
                  Sign out
                </Button>
              )}
            </div>
          </div>

          <props.Content />
        </Authenticated>
        <Unauthenticated>
          <div className="w-screen h-screen flex justify-center items-center">
            <Button
              variant="fancy"
              type="button"
              onClick={() => void signIn("google")}
            >
              <GoogleLogo className="mr-2 h-4 w-4" /> Sign in with Google
            </Button>
          </div>
        </Unauthenticated>
      </main>
    </>
  );
}
