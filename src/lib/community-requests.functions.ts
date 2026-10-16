import { createServerFn } from "@tanstack/react-start";

export const STATE_CODES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;

export const ORG_TYPES = {
  city_government: "City or local government",
  youth_council: "Youth council or commission",
  school: "School or district",
  community_org: "Community or youth organization",
  student: "Student (with a supporting adult)",
  other: "Other",
} as const;

export type CityRequestInput = {
  cityName: string;
  stateCode: string;
  orgType: string;
  organization?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  message: string;
  engagementPlan: string;
  website?: string; // honeypot — must stay empty
  deviceId?: string;
};

export function validateCityRequest(d: CityRequestInput) {
  if ((d.website ?? "").trim() !== "") throw new Error("Couldn't send your application.");
  const cityName = (d.cityName ?? "").trim();
  if (cityName.length < 2 || cityName.length > 80) throw new Error("Enter a city name.");
  if (!(STATE_CODES as readonly string[]).includes(d.stateCode)) throw new Error("Pick a state.");
  if (!(d.orgType in ORG_TYPES)) throw new Error("Pick an organization type.");
  const contactName = (d.contactName ?? "").trim();
  if (contactName.length < 2 || contactName.length > 100) throw new Error("Enter a contact name.");
  const contactEmail = (d.contactEmail ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || contactEmail.length > 200)
    throw new Error("Enter a valid email.");
  const contactPhone = (d.contactPhone ?? "").trim();
  if (contactPhone && !/^[0-9+().\-\s]{7,25}$/.test(contactPhone)) throw new Error("Enter a valid phone number or leave it blank.");
  const message = (d.message ?? "").trim();
  if (message.length < 20 || message.length > 1000) throw new Error("Tell us why you want to join (at least 20 characters).");
  const engagementPlan = (d.engagementPlan ?? "").trim();
  if (engagementPlan.length < 20 || engagementPlan.length > 1000)
    throw new Error("Tell us how you'll engage young people (at least 20 characters).");
  return {
    cityName,
    stateCode: d.stateCode,
    orgType: d.orgType,
    organization: (d.organization ?? "").trim().slice(0, 120) || null,
    contactName,
    contactEmail,
    contactPhone: contactPhone || null,
    message,
    engagementPlan,
    deviceId: (d.deviceId ?? "").slice(0, 64) || null,
  };
}

export const submitCityRequest = createServerFn({ method: "POST" })
  .inputValidator(validateCityRequest)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 86400_000).toISOString();
    const { count } = await supabaseAdmin
      .from("community_requests")
      .select("id", { count: "exact", head: true })
      .eq("contact_email", data.contactEmail)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) throw new Error("You've sent several applications today — we'll review them soon.");
    if (data.deviceId) {
      const { count: dc } = await supabaseAdmin
        .from("community_requests")
        .select("id", { count: "exact", head: true })
        .eq("submitter_device", data.deviceId)
        .gte("created_at", since);
      if ((dc ?? 0) >= 3) throw new Error("You've sent several applications today — we'll review them soon.");
    }
    const { moderateText } = await import("@/lib/moderation.server");
    const check = await moderateText(`${data.message}\n${data.engagementPlan}`, "topic");
    if (!check.allowed) throw new Error(check.reason || "Please rephrase your application.");
    const { error } = await supabaseAdmin.from("community_requests").insert({
      city_name: data.cityName,
      state_code: data.stateCode,
      requester_role: data.orgType,
      org_type: data.orgType,
      organization: data.organization,
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone,
      message: data.message,
      engagement_plan: data.engagementPlan,
      submitter_device: data.deviceId,
    });
    if (error) throw new Error("Couldn't send your application. Try again.");
    return { ok: true };
  });
