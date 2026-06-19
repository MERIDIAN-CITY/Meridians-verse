import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFoundState() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <span className="text-6xl font-extrabold tracking-tight text-primary/40 select-none">
        404
      </span>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Page Not Found
      </h1>
      <p className="mt-4 max-w-md text-base text-muted-foreground">
        The resource or segment route you are attempting to trace does not exist on the Meridian index topology.
      </p>
      
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          Return Home
        </Link>
        <a 
          href="https://github.com/your-org/meridian/issues" 
          target="_blank" 
          rel="noreferrer" 
          className={buttonVariants({ variant: "outline" })}
        >
          Report an Issue
        </a>
      </div>
    </div>
  );
}