import { ConnectSocialModal } from '@/features/social/SocialLinks';
import { useApp } from '@/state/store';
import { GiftModal, BuyPointsModal, AddMoneyModal, ShopItemModal, PlusModal, UnlockModal, TipModal, DonateModal, SponsorModal } from './PaymentModals';
import { ReportModal, RelationshipModal, GroupDmModal, IncomingCallModal, IpWarningModal, ExternalLinkModal, EditMessageModal, QuickSwitcher, MemberCardModal, JoinInviteModal } from './SocialModals';
import { CreateCommunityModal, ApplyModal, AllCommunitiesModal, CreateChannelModal, EditChannelModal, CreateEventModal, EventModal, NewPostModal, PostModal, ModerateModal, EmojiUploadModal, BridgeRequestModal, ExpertRequestModal } from './CommunityModals';
import { PostStoryModal, StoryAudienceModal, HighlightModal, ProfileMediaModal, DeleteAccountModal, PasswordModal, VerifyPhoneModal, PayoutKycModal } from './ProfileModals';

/** One modal at a time (a stack restores the previous one on close). Confirmations render above it. */
export function ModalHost() {
  const m = useApp(s => s.modal);
  if (!m) return null;
  switch (m.kind) {
    case 'gift': return <GiftModal key="gift" to={m.to} serverId={m.serverId} />;
    case 'buyPoints': return <BuyPointsModal />;
    case 'addMoney': return <AddMoneyModal />;
    case 'shop': return <ShopItemModal itemId={m.itemId} />;
    case 'plus': return <PlusModal />;
    case 'unlock': return <UnlockModal channelId={m.channelId} />;
    case 'tip': return <TipModal to={m.to} />;
    case 'donate': return <DonateModal serverId={m.serverId} />;
    case 'sponsor': return <SponsorModal serverId={m.serverId} />;
    case 'report': return <ReportModal target={m.target} />;
    case 'relationship': return <RelationshipModal withId={m.with} />;
    case 'groupDm': return <GroupDmModal convId={m.convId} />;
    case 'incomingCall': return <IncomingCallModal convId={m.convId} />;
    case 'ipWarning': return <IpWarningModal then={m.then} />;
    case 'externalLink': return <ExternalLinkModal href={m.href} />;
    case 'editMessage': return <EditMessageModal scope={m.scope} keyId={m.key} messageId={m.messageId} />;
    case 'quick': return <QuickSwitcher />;
    case 'memberCard': return <MemberCardModal serverId={m.serverId} userId={m.userId} />;
    case 'connectSocial': return <ConnectSocialModal owner={m.owner} platform={m.platform} />;
    case 'joinInvite': return <JoinInviteModal />;
    case 'createCommunity': return <CreateCommunityModal />;
    case 'apply': return <ApplyModal />;
    case 'allCommunities': return <AllCommunitiesModal />;
    case 'createChannel': return <CreateChannelModal serverId={m.serverId} categoryId={m.categoryId} />;
    case 'editChannel': return <EditChannelModal channelId={m.channelId} />;
    case 'createEvent': return <CreateEventModal serverId={m.serverId} />;
    case 'event': return <EventModal eventId={m.eventId} />;
    case 'newPost': return <NewPostModal channelId={m.channelId} />;
    case 'post': return <PostModal postId={m.postId} />;
    case 'moderate': return <ModerateModal serverId={m.serverId} userId={m.userId} action={m.action} />;
    case 'emojiUpload': return <EmojiUploadModal serverId={m.serverId} type={m.type} />;
    case 'bridgeRequest': return <BridgeRequestModal serverId={m.serverId} />;
    case 'expertRequest': return <ExpertRequestModal serverId={m.serverId} />;
    case 'postStory': return <PostStoryModal />;
    case 'storyAudience': return <StoryAudienceModal storyId={m.storyId} />;
    case 'highlight': return <HighlightModal storyId={m.storyId} />;
    case 'profileMedia': return <ProfileMediaModal which={m.which} />;
    case 'deleteAccount': return <DeleteAccountModal />;
    case 'password': return <PasswordModal />;
    case 'verifyPhone': return <VerifyPhoneModal />;
    case 'payoutKyc': return <PayoutKycModal />;
  }
}
