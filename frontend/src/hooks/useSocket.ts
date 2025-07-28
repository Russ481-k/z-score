import { useEffect } from "react";
import { socket } from "@/lib/socket";

export const useSocket = () => {
  useEffect(() => {
    socket.connect();

    function onConnect() {
      console.log("connected");
    }

    function onDisconnect() {
      console.log("disconnected");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, []);
};
