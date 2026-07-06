import { asyncHandler } from "../../../Services/ErrorHandler.services.js";

export const getPrayerTimes = asyncHandler(async (req, res, next) => {
    const {
        date,
        method = 5,
        address = "Nablus, Palestine"
    } = req.query || {};

    // Default to today's date in DD-MM-YYYY format if not provided
    let formattedDate = date;
    if (!formattedDate) {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();
        formattedDate = `${day}-${month}-${year}`;
    }

    const url = `http://api.aladhan.com/v1/timingsByAddress/${formattedDate}?address=${encodeURIComponent(address)}&method=${method}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return next(new Error(`Failed to fetch prayer times from source: ${response.statusText}`, { cause: response.status }));
        }

        const result = await response.json();
        if (result.code !== 200 || !result.data) {
            return next(new Error("Invalid response received from prayer times provider", { cause: 502 }));
        }

        return res.status(200).json({
            success: true,
            message: "Prayer times retrieved successfully",
            data: {
                timings: result.data.timings,
                date: result.data.date,
                meta: result.data.meta,
            }
        });
    } catch (error) {
        return next(new Error(`Failed to fetch prayer times: ${error.message}`));
    }
});
