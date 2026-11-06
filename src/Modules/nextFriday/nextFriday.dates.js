// A date-only input is stored at UTC midnight; weekday checks use the mosque's day.
export const MOSQUE_TIME_ZONE = "Asia/Hebron";

export const mosqueDateKey = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: MOSQUE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(date);
    const get = type => parts.find(part => part.type === type).value;
    return `${get("year")}-${get("month")}-${get("day")}`;
};

export const isFriday = date => new Intl.DateTimeFormat("en-US", {
    timeZone: MOSQUE_TIME_ZONE, weekday: "short"
}).format(date) === "Fri";
