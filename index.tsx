/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findLazy, findStoreLazy } from "@webpack";
// eslint-disable-next-line unused-imports/no-unused-imports
import { ChannelStore, Constants, FluxDispatcher, MessageActions, PermissionsBits, PermissionStore, RestAPI, SelectedChannelStore, showToast, SnowflakeUtils, Toasts, useState } from "@webpack/common";

const cl = classNameFactory("vc-goose-");
const CloudUpload = findLazy(m => m.prototype?.trackUploadFinished);
const PendingReplyStore = findStoreLazy("PendingReplyStore");
const { getSlowmodeCooldownGuess } = findByPropsLazy("getSlowmodeCooldownGuess");

// This doesn't actually do anything, its just here because the plugin doesnt work with it
const settings = definePluginSettings({
    randomGooseSendMethod: {
        description: "Choose the buttons behavior.",
        type: OptionType.SELECT,
        options: [
            { label: "Left Click: Send as a link, Right Click: Send as an attachment", value: "link", default: true },
            { label: "Left Click: Send as an attachment, Right Click: Send as a link", value: "attachment" }
        ],
        hidden: true
    },

});

async function getcutegoose(): Promise<string> {
    const res = await fetch("https://nekos.life/api/v2/img/goose");
    const url = (await res.json()).url as string;
    return url;
}

async function sendGooseLink(channelId: string, link: string) {
    const reply = PendingReplyStore.getPendingReply(channelId);
    if (reply) FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
    try {
        if (getSlowmodeCooldownGuess(channelId) === 0) {
            const channel = ChannelStore.getChannel(channelId);
            if (channel.guild_id && !PermissionStore.can(PermissionsBits.EMBED_LINKS, channel)) {
                showToast("Missing required permissions to embed links", Toasts.Type.FAILURE);
                return;
            }
            RestAPI.post({
                url: Constants.Endpoints.MESSAGES(channelId),
                body: {
                    channel_id: channelId,
                    content: link,
                    nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                    sticker_ids: [],
                    type: 0,
                    attachments: [],
                    message_reference: reply ? MessageActions.getSendMessageOptionsForReply(reply)?.messageReference : null,
                }
            });

            const cooldownMs = channel.rateLimitPerUser * 1000;

            FluxDispatcher.dispatch({
                type: "SLOWMODE_SET_COOLDOWN",
                channelId,
                slowmodeType: 0,
                cooldownMs
            });
        }
    } catch (error) {
        console.error("Failed to send Goose  link:", error);
        showToast("Failed to send Goose image", Toasts.Type.FAILURE);
    }
}

async function uploadGooseImage(url: string, channelId: string) {
    const reply = PendingReplyStore.getPendingReply(channelId);
    if (reply) FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
    try {
        if (getSlowmodeCooldownGuess(channelId) === 0) {
            const channel = ChannelStore.getChannel(channelId);

            if (channel.guild_id && !PermissionStore.can(PermissionsBits.ATTACH_FILES, channel)) {
                showToast("Missing required permissions to upload files", Toasts.Type.FAILURE);
                return;
            }

            showToast("Uploading image, this may take a few seconds.", Toasts.Type.MESSAGE);
            const response = await fetch(url);
            const blob = await response.blob();
            const file = new File([blob], "goose.jpg", { type: "image/jpeg" });

            const upload = new CloudUpload({
                file,
                isThumbnail: false,
                platform: 1,
            }, channelId, false, 0);

            upload.on("complete", () => {
                RestAPI.post({
                    url: Constants.Endpoints.MESSAGES(channelId),
                    body: {
                        channel_id: channelId,
                        content: "",
                        nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                        sticker_ids: [],
                        type: 0,
                        attachments: [{
                            id: "0",
                            filename: upload.filename,
                            uploaded_filename: upload.uploadedFilename
                        }],
                        message_reference: reply ? MessageActions.getSendMessageOptionsForReply(reply)?.messageReference : null,
                    }
                });

                const cooldownMs = channel.rateLimitPerUser * 1000;

                FluxDispatcher.dispatch({
                    type: "SLOWMODE_SET_COOLDOWN",
                    channelId,
                    slowmodeType: 0,
                    cooldownMs
                });
            });

            upload.on("error", () => showToast("Failed to upload Goose image", Toasts.Type.FAILURE));
            upload.upload();
        }
    } catch (error) {
        console.error("Failed to upload Goose image:", error);
        MessageActions.sendMessage(channelId, { content: "Failed to upload Goose image :(" });
    }
}

export const GooseChatBarIcon: ChatBarButton = ({ isMainChat }) => {

    const currentChannelId = SelectedChannelStore.getChannelId();

    const handleClick = async () => {
        if (currentChannelId) {
            const link = await getUrl();
            if (settings.store.randomGooseSendMethod) {
                await sendGooseLink(currentChannelId, link);
            } else {
                await uploadGooseImage(link, currentChannelId);
            }
        }
    };


    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Click for Goose"
            onClick={handleClick}
            buttonProps={{
                "aria-label": "Goose Button",
            }}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512">
                <path fill="currentColor" d="M370.019 18.023c-2.843-.035-5.859.197-9.075.73c-81.664 13.54-38.657 142.295-36.095 217.397c-84.163-16.327-168.007 121.048-289.118 152.787c58.086 52.473 206.05 89.6 331.739 11.85c39.804-24.622 45.26-92.014 34.343-165.049c-6.703-44.845-71.755-133.176-10.269-141.266l.611-.504c12.884-10.608 16.606-23.842 22.522-37.699l1.699-3.976c-11.688-16.016-23.17-33.986-46.357-34.27m5.08 19.625a9 9 0 0 1 9 9a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 9-9m52.703 34.172c-3.28 8.167-7.411 17.45-14.612 26.293c21.035 7.63 41.929 3.078 63.079-.863c-15.515-9.272-32.003-18.195-48.467-25.43m-89.608 181.053c19.109 25.924 21.374 53.965 11.637 78.183s-30.345 44.797-55.67 60.49c-50.65 31.389-121.288 44.45-170.553 17.11l8.735-15.738c40.364 22.4 106.342 11.833 152.338-16.67c22.997-14.252 40.72-32.684 48.449-51.906s6.596-39.053-9.426-60.79zM273.28 456.322a333 333 0 0 1-19.095 3.232l-3.508 16.426h-13.084l3.508-14.842a400 400 0 0 1-18.852 1.506l-7.408 31.336h95.79v-18h-41.548z" />
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "Gooses",
    description: "sends a photo of a random goose at the press of a button, or via a /command",
    authors: [Devs.Moxxie,
    { name: "Zach Orange", id: 683550738198036516n },
    // Import from EquicordDev for Equicord
    { name: "krystalskullofficial", id: 929208515883569182n }
    ],
    settings,

    commands: [{
        name: "goose",
        description: "command that sends random geese",
        execute: async opts => ({
            content: await getcutegoose()
        })
    }],

    start() {
        addChatBarButton("vc-goose", GooseChatBarIcon);
    },
    stop() {
        removeChatBarButton("vc-goose");
    }


});

export async function getUrl() {
    const GooseResponse = await fetch("https://nekos.life/api/v2/img/goose");
    const GooseJson = await GooseResponse.json();
    return GooseJson.url;
}
