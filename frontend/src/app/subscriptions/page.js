"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/mainLayout";
import ChannelCard from "@/components/ui/channelcard";
import { getSubscriptions } from "@/lib/video";

const FALLBACK_THUMBNAIL =
  "https://www.istockphoto.com/vector/user-profile-https://iconscout.com/icons/profileicon-avatar-or-person-icon-profile-picture-portrait-symbol-default-gm1495088043-518213332";

function toCardProps(channel) {
    return {
      channel: channel,
      username: channel.username,
      fullName: channel.full_name,
      profileImageUrl: channel.profile_image_urlL,
    };
  }

export default function SubscriptionsPage() {
    const [subscribedChannels, setSubscribedChannels] = useState([]);
    useEffect(() => {
        getSubscriptions()
        .then((channels) => {
            const list = Array.isArray(channels) ? channels : (channels.items ?? []);
            setSubscribedChannels(list.map(toCardProps));
        })
        .catch((err) => {
            console.error(err);
        });
    }, []);
    return (
        <MainLayout>
            <h2 className="text-2xl font-bold mb-6">Subscribed Channels</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {subscribedChannels.map((channel) => (
                    <ChannelCard key={channel.id} {...channel} />
                ))}
            </div>
        </MainLayout>
    );
}