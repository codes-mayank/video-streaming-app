"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/mainLayout";
import ChannelCard from "@/components/ui/channelcard";
import AuthGate from "@/components/auth/authgate";
import { getSubscriptions } from "@/lib/video";

function toCardProps(channel) {
  return {
    id: channel.id,
    username: channel.username,
    fullName: channel.full_name,
    profileImageUrl: channel.profile_image_url,
  };
}

function SubscriptionsContent() {
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
          <ChannelCard key={channel.id ?? channel.username} {...channel} />
        ))}
      </div>
    </MainLayout>
  );
}

export default function SubscriptionsPage() {
  return (
    <AuthGate feature="subscriptions">
      <SubscriptionsContent />
    </AuthGate>
  );
}
