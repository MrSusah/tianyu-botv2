const CHANNELS = {
    HUNT: "1495049686363410535",   // Ganti jika perlu
    CASINO: "1495050723522641970",  // Ganti jika perlu
    TEST: "1494682289530081413"     // Ganti jika perlu
};

function validateHuntChannel(channelId) {
    return channelId === CHANNELS.HUNT || channelId === CHANNELS.TEST;
}

function validateCasinoChannel(channelId) {
    return channelId === CHANNELS.CASINO || channelId === CHANNELS.TEST;
}

module.exports = {
    CHANNELS,
    validateHuntChannel,
    validateCasinoChannel,
    HUNT_CHANNEL_ID: CHANNELS.HUNT,
    CASINO_CHANNEL_ID: CHANNELS.CASINO,
    TEST_CHANNEL_ID: CHANNELS.TEST
};