import api from "@/lib/axios";

export const createRecurring = (payload: any) =>
  api.post("/admin/recurrings", payload);
export const listRecurrings = () => api.get("/admin/recurrings");
export const applyRecurring = (id: string, months = 1) =>
  api.post(`/admin/recurrings/${id}/apply?months=${months}`);
