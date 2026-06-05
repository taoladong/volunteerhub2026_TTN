import { apiRequest } from "./apiClient";

export const getEvents = (params = {}) =>
    apiRequest({ method: "get", url: "/events", params });

export const getEventById = (id) =>
    apiRequest({ method: "get", url: `/events/${id}` });

export const getRecommendedEvents = () =>
    apiRequest({ method: "get", url: "/events/recommended" });

export const getMyRegistrations = () =>
    apiRequest({ method: "get", url: "/my-registrations" });

export const applyToVolunteerEvent = ({ eventId, ...payload }) =>
    apiRequest({
        method: "post",
        url: `/events/${eventId}/register`,
        data: payload,
    });

export const withdrawVolunteerEvent = (eventId) =>
    apiRequest({
        method: "delete",
        url: `/events/${eventId}/register`,
    });
