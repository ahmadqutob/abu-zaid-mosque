import joi from "joi";

export const getPrayerTimes = joi.object({
    city: joi.string().trim().max(100).optional().default("Jerusalem"),
    country: joi.string().trim().max(100).optional().default("Palestine"),
    date: joi.string().pattern(/^\d{2}-\d{2}-\d{4}$/).optional().messages({
        "string.pattern.base": "Date must be in DD-MM-YYYY format"
    }),
    method: joi.number().integer().min(0).max(99).optional().default(5)
});
