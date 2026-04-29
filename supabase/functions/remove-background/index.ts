import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handler } from "./handler.ts";

serve(handler);
