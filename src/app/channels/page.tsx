'use client'

import {get, getEndpoints} from "@/app/lib/backend";
import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {GetChannelsChannel, GetChannelsResponse} from "@/app/entity/entities";

export default function Page() {
    const [channels, setChannels] = useState<GetChannelsChannel[]>([]);

    useEffect(() => {
        get(getEndpoints().channel_get_all)
            .then((data: GetChannelsResponse) => {
                setChannels(data.channels)
            })
    }, [])

    const router = useRouter()

    function sortChannels(channels: GetChannelsChannel[]) {
        return channels.sort((a, b) => {
            if (a.name > b.name) return 1
            if (a.name < b.name) return -1
            return 0
        })
    }

    return (
        <main>
            <div className="d-flex justify-content-center">
                <ul className="list-group">
                    {
                        sortChannels(channels).map(
                            (channel: GetChannelsChannel, index: number, arr: GetChannelsChannel[]) => {
                                return <li key={channel.id} className="list-group-item text-white">
                                    <div className="container-fluid">
                                        <div className="row">
                                            <div className="col" onClick={e => {
                                                router.push(`/channel/${channel.id}`)
                                            }}>{channel.name}</div>
                                        </div>
                                    </div>
                                </li>
                            }
                        )
                    }
                </ul>
            </div>
        </main>
    )
}