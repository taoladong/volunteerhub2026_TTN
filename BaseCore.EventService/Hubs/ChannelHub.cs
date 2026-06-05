using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using BaseCore.Services.VolunteerHub;
using System.Security.Claims;

namespace BaseCore.EventService.Hubs
{
    [Authorize]
    public class ChannelHub : Hub
    {
        private readonly IChannelService _channelService;

        public ChannelHub(IChannelService channelService)
        {
            _channelService = channelService;
        }

        public async Task JoinChannel(int channelId)
        {
            var userId = int.Parse(Context.User!.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            if (!await _channelService.CanAccessChannelAsync(channelId, userId))
                throw new HubException("Not authorized");

            await Groups.AddToGroupAsync(Context.ConnectionId, $"channel-{channelId}");
        }

        public Task LeaveChannel(int channelId)
        {
            return Groups.RemoveFromGroupAsync(Context.ConnectionId, $"channel-{channelId}");
        }
    }
}
