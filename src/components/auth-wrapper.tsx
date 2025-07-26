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
          <div className="top-0 right-0 fixed mr-2 mt-2 flex gap-5">
            <div className="flex">
              <img
                src={image ?? undefined}
                className="w-7 h-7 rounded-full my-auto"
              ></img>{" "}
              <p className="ml-2 my-auto">{viewer ?? "Anonymous"}</p>
            </div>
            {isAuthenticated && (
              <Button variant="fancy" onClick={() => void signOut()}>
                Sign out
              </Button>
            )}
          </div>
          <props.Content />
        </Authenticated>
        <Unauthenticated>
          <div className="w-[100vw] h-[100vh]">
          <Button
            className="w-[14vw] h-[4vh] mx-[43vw] my-[48vh]"
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
